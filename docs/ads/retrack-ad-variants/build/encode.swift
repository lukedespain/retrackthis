// swift encode.swift <framesDir> <out.mp4> <fps>
import AVFoundation
import CoreGraphics
import Foundation
import ImageIO

let args = CommandLine.arguments
let dir = args[1], out = args[2], fps = Int32(args[3])!
let files = try FileManager.default.contentsOfDirectory(atPath: dir).filter { $0.hasSuffix(".png") }.sorted()

func load(_ name: String) -> CGImage {
  let src = CGImageSourceCreateWithURL(URL(fileURLWithPath: dir + "/" + name) as CFURL, nil)!
  return CGImageSourceCreateImageAtIndex(src, 0, nil)!
}

let first = load(files[0])
let w = first.width, h = first.height
let url = URL(fileURLWithPath: out)
try? FileManager.default.removeItem(at: url)

let writer = try AVAssetWriter(outputURL: url, fileType: .mp4)
let input = AVAssetWriterInput(mediaType: .video, outputSettings: [
  AVVideoCodecKey: AVVideoCodecType.h264,
  AVVideoWidthKey: w,
  AVVideoHeightKey: h,
  AVVideoColorPropertiesKey: [
    AVVideoColorPrimariesKey: AVVideoColorPrimaries_ITU_R_709_2,
    AVVideoTransferFunctionKey: AVVideoTransferFunction_ITU_R_709_2,
    AVVideoYCbCrMatrixKey: AVVideoYCbCrMatrix_ITU_R_709_2,
  ],
  AVVideoCompressionPropertiesKey: [
    AVVideoAverageBitRateKey: 10_000_000,
    AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel,
  ],
])
input.expectsMediaDataInRealTime = false
let adaptor = AVAssetWriterInputPixelBufferAdaptor(assetWriterInput: input, sourcePixelBufferAttributes: [
  kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32ARGB,
  kCVPixelBufferWidthKey as String: w,
  kCVPixelBufferHeightKey as String: h,
])
writer.add(input)
writer.startWriting()
writer.startSession(atSourceTime: .zero)

for (i, name) in files.enumerated() {
  let img = i == 0 ? first : load(name)
  var pb: CVPixelBuffer?
  CVPixelBufferPoolCreatePixelBuffer(nil, adaptor.pixelBufferPool!, &pb)
  let buf = pb!
  CVPixelBufferLockBaseAddress(buf, [])
  let ctx = CGContext(
    data: CVPixelBufferGetBaseAddress(buf), width: w, height: h, bitsPerComponent: 8,
    bytesPerRow: CVPixelBufferGetBytesPerRow(buf), space: CGColorSpace(name: CGColorSpace.sRGB)!,
    bitmapInfo: CGImageAlphaInfo.noneSkipFirst.rawValue)!
  ctx.draw(img, in: CGRect(x: 0, y: 0, width: w, height: h))
  CVPixelBufferUnlockBaseAddress(buf, [])
  while !input.isReadyForMoreMediaData { usleep(1000) }
  adaptor.append(buf, withPresentationTime: CMTime(value: Int64(i), timescale: fps))
}

input.markAsFinished()
let done = DispatchSemaphore(value: 0)
writer.finishWriting { done.signal() }
done.wait()
if writer.status == .completed {
  print("wrote \(out) (\(files.count) frames)")
} else {
  print("failed: \(String(describing: writer.error))")
  exit(1)
}
