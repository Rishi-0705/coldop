import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { severityScore, roomCriticality } from '@/lib/coldops/detection'
import { broadcast } from '@/lib/realtime/client'

export const dynamic = 'force-dynamic'

/**
 * POST /api/vlm-scan
 * Accepts a base64 image from the camera, sends it to the VLM (z-ai vision model)
 * for product identification + amount counting, then analyzes the result against
 * product specs to generate a recommendation.
 *
 * Body: { image: "data:image/jpeg;base64,...", manualTemp?: number, roomCode?: string }
 * Returns: { vlmResult, matchedProduct, analysis, recommendation }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { image, manualTemp, roomCode } = body

    if (!image) {
      return NextResponse.json({ error: 'Image required' }, { status: 400 })
    }

    // === Step 1: Send to VLM for product identification ===
    const ZAI = (await import('z-ai-web-dev-sdk')).default
    const zai = await ZAI.create()

    const prompt = `You are a cold chain inventory scanner analyzing a warehouse camera feed.
Analyze this image and identify:
1. Product name (read any visible labels, brand name, product type)
2. Estimated count/amount of items visible (pallets, cartons, bottles, etc.)
3. Product category (Dairy, Juice, Raw Material, Beverage, or Unknown)
4. Any visible text on packaging (brand, expiry date, batch number)
5. If you can see a thermometer or temperature display, read the temperature value

Return your response as JSON ONLY (no markdown, no code blocks):
{"productName":"string","estimatedCount":number,"category":"Dairy|Juice|Raw Material|Beverage|Unknown","visibleText":"string","temperatureReading":number|null,"confidence":"high|medium|low"}`

    const vlmResponse = await zai.chat.completions.createVision({
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: image } },
          ],
        },
      ],
      thinking: { type: 'disabled' },
    })

    const rawContent = vlmResponse.choices[0]?.message?.content || ''

    // Parse VLM JSON response (handle markdown code blocks)
    let vlmResult: any = null
    try {
      const jsonMatch = rawContent.match(/\{[\s\S]*\}/)
      vlmResult = JSON.parse(jsonMatch ? jsonMatch[0] : rawContent)
    } catch {
      vlmResult = {
        productName: 'Parse Error',
        estimatedCount: 0,
        category: 'Unknown',
        visibleText: rawContent.slice(0, 200),
        temperatureReading: null,
        confidence: 'low',
      }
    }

    // === Step 2: Fuzzy-match against product catalog ===
    const catalog = await db.productSpec.findMany()
    let matchedProduct = null
    let isUnknown = true

    if (vlmResult.productName) {
      const vlmName = vlmResult.productName.toLowerCase()
      // Exact match first
      matchedProduct = catalog.find(p =>
        p.productName.toLowerCase() === vlmName ||
        p.productCode.toLowerCase() === vlmName
      )
      // Partial match
      if (!matchedProduct) {
        matchedProduct = catalog.find(p =>
          p.productName.toLowerCase().includes(vlmName) ||
          vlmName.includes(p.productName.toLowerCase()) ||
          p.productName.toLowerCase().split(' ').some(word => word.length > 3 && vlmName.includes(word))
        )
      }
      if (matchedProduct) isUnknown = false
    }

    // === Step 3: Analyze and generate recommendation ===
    const temperature = manualTemp !== undefined ? parseFloat(manualTemp) : vlmResult.temperatureReading
    const productSpec = matchedProduct
    const count = vlmResult.estimatedCount || 1

    const issues: any[] = []

    // Check temperature compliance
    if (productSpec && temperature !== null && !isNaN(temperature)) {
      if (temperature > productSpec.maxTemp) {
        issues.push({
          type: 'TEMP_TOO_HIGH',
          severity: 'CRITICAL',
          message: `Temperature ${temperature}°C exceeds max ${productSpec.maxTemp}°C for ${productSpec.productName}`,
          recommendation: 'Reduce setpoint immediately — initiate progressive setback to lower temperature',
          actionType: 'TEMP_ADJUSTMENT',
        })
      } else if (temperature < productSpec.minTemp) {
        issues.push({
          type: 'TEMP_TOO_LOW',
          severity: 'HIGH',
          message: `Temperature ${temperature}°C below min ${productSpec.minTemp}°C for ${productSpec.productName}`,
          recommendation: 'Raise setpoint gradually — product may freeze',
          actionType: 'TEMP_ADJUSTMENT',
        })
      }
    }

    // Check amount for consolidation
    if (count > 0 && count < 5) {
      issues.push({
        type: 'LOW_STOCK',
        severity: 'MEDIUM',
        message: `Only ${count} units detected — consolidation candidate`,
        recommendation: 'Consider merging with another room to reduce energy waste',
        actionType: 'CONSOLIDATION',
      })
    }

    // Check expiry if visible text contains date info
    if (vlmResult.visibleText && productSpec) {
      const dateMatch = vlmResult.visibleText.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/)
      if (dateMatch) {
        const expiry = new Date(dateMatch[1])
        if (!isNaN(expiry.getTime())) {
          const daysToExpiry = Math.ceil((expiry.getTime() - Date.now()) / 86400000)
          if (daysToExpiry <= 3) {
            issues.push({
              type: 'NEAR_EXPIRY',
              severity: 'HIGH',
              message: `Product expires in ${daysToExpiry} days — FEFO priority`,
              recommendation: 'Move to outbound priority — dispatch immediately',
              actionType: 'FEFO_ACTION',
            })
          } else if (daysToExpiry <= 7) {
            issues.push({
              type: 'APPROACHING_EXPIRY',
              severity: 'MEDIUM',
              message: `Product expires in ${daysToExpiry} days`,
              recommendation: 'Flag for FEFO tracking — prioritize in next outbound batch',
              actionType: 'FEFO_ACTION',
            })
          }
        }
      }
    }

    // Unknown product
    if (isUnknown) {
      issues.push({
        type: 'UNKNOWN_PRODUCT',
        severity: 'LOW',
        message: `Product "${vlmResult.productName}" not in catalog — manual verification needed`,
        recommendation: 'Add to product catalog or verify classification',
        actionType: 'MANUAL_REVIEW',
      })
    }

    // Calculate overall severity score
    const roomZone = roomCode ? (await db.coldRoom.findUnique({ where: { code: roomCode } }))?.zone : 'Chilled'
    const severityInput = {
      rmWaste: issues.length * 9.18, // estimated RM impact
      durationHours: issues.filter(i => i.severity === 'CRITICAL').length * 3,
      safetyRisk: issues.filter(i => i.type.includes('TEMP') || i.type.includes('EXPIRY')).length * 25,
      roomCriticality: roomCriticality(roomZone || 'Chilled'),
    }
    const { score, bucket } = severityScore(severityInput)

    // Build the scan result
    const scanResult = {
      id: `SCAN-${Date.now()}`,
      timestamp: new Date().toISOString(),
      vlm: vlmResult,
      matchedProduct: matchedProduct ? {
        productCode: matchedProduct.productCode,
        productName: matchedProduct.productName,
        category: matchedProduct.category,
        minTemp: matchedProduct.minTemp,
        maxTemp: matchedProduct.maxTemp,
        shelfLifeDays: matchedProduct.shelfLifeDays,
        allergenTags: matchedProduct.allergenTags,
      } : null,
      isUnknown,
      temperature,
      count,
      issues,
      severityScore: score,
      severity: bucket,
      roomCode: roomCode || null,
      // Primary recommendation (highest severity issue)
      recommendation: issues.length > 0 ? issues.sort((a, b) => {
        const order = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }
        return order[a.severity as keyof typeof order] - order[b.severity as keyof typeof order]
      })[0] : {
        type: 'OK',
        severity: 'LOW',
        message: 'No issues detected — product is within spec',
        recommendation: 'No action needed',
        actionType: 'NONE',
      },
    }

    // === Step 4: Create a notification + log entry ===
    if (issues.length > 0) {
      const notif = await db.notification.create({
        data: {
          type: issues[0].type.includes('TEMP') ? 'SAFETY' : issues[0].type === 'LOW_STOCK' ? 'CONSOLIDATION' : 'SYSTEM',
          severity: bucket,
          severityScore: score,
          title: `Camera Scan: ${matchedProduct?.productName || vlmResult.productName || 'Unknown Product'}`,
          message: issues[0].message,
          roomId: null,
          rmImpact: severityInput.rmWaste,
          rmPerHour: 9.18,
          durationHours: severityInput.durationHours,
          actionType: issues[0].actionType,
          refId: scanResult.id,
          status: 'OPEN',
          channels: bucket === 'CRITICAL' ? 'DASHBOARD,SMS,WHATSAPP' : 'DASHBOARD',
        },
      })

      await broadcast('notification-new', {
        id: notif.id,
        type: notif.type,
        severity: notif.severity,
        severityScore: notif.severityScore,
        title: notif.title,
        message: notif.message,
        rmImpact: notif.rmImpact,
        actionType: notif.actionType,
        status: 'OPEN',
        channels: notif.channels,
        createdAt: notif.createdAt.toISOString(),
      })
    }

    return NextResponse.json(scanResult)
  } catch (error: any) {
    console.error('VLM scan error:', error)
    return NextResponse.json({ error: error.message || 'VLM scan failed' }, { status: 500 })
  }
}
