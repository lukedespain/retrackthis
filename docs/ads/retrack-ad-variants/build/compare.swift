// swift compare.swift <a.mp4> <b.mp4>
// Decodes both videos at 15 timestamps and reports per-pixel differences.
import AVFoundation
import CoreGraphics
import Foundation

func pixels(_ img: CGImage) -> [UInt8] {
  let w = img.width, h = img.height
  var buf = [UInt8](repeating: 0, count: w * h * 4)
  let ctx = CGContext(data: &buf, width: w, height: h, bitsPerComponent: 8, bytesPerRow: w * 4,
    space: CGColorSpace(name: CGColorSpace.sRGB)!, bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue)!
  ctx.draw(img, in: CGRect(x: 0, y: 0, width: w, height: h))
  return buf
}

func generator(_ path: String) -> AVAssetImageGenerator {
  let g = AVAssetImageGenerator(asset: AVURLAsset(url: URL(fileURLWithPath: path)))
  g.requestedTimeToleranceBefore = .zero
  g.requestedTimeToleranceAfter = .zero
  return g
}

let a = generator(CommandLine.arguments[1]), b = generator(CommandLine.arguments[2])
let sem = DispatchSemaphore(value: 0)
Task {
  var worstMax = 0, worstMean = 0.0
  for i in 0..<15 {
    let t = CMTime(value: Int64(i * 14), timescale: 30)
    let pa = pixels(try await a.image(at: t).image), pb = pixels(try await b.image(at: t).image)
    var maxD = 0, sum = 0, n = 0
    for j in stride(from: 0, to: pa.count, by: 4) {
      for k in 0..<3 { let d = abs(Int(pa[j + k]) - Int(pb[j + k])); maxD = max(maxD, d); sum += d; n += 1 }
    }
    worstMax = max(worstMax, maxD); worstMean = max(worstMean, Double(sum) / Double(n))
  }
  print(String(format: "max channel diff %d / 255, worst mean diff %.4f", worstMax, worstMean))
  sem.signal()
}
sem.wait()
