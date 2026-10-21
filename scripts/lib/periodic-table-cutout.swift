import Foundation
import Vision
import CoreImage
import ImageIO
import UniformTypeIdentifiers

// Local Apple Vision segmentation only; it does not generate or repaint the subject.
// Called by generate-periodic-table-cutouts.mjs on macOS 14 or newer.
let context = CIContext(options: [.workingColorSpace: CGColorSpace(name: CGColorSpace.sRGB)!])
for index in stride(from: 1, to: CommandLine.arguments.count, by: 2) {
 let input = URL(fileURLWithPath: CommandLine.arguments[index])
 let output = URL(fileURLWithPath: CommandLine.arguments[index + 1])
 do {
  guard let image = CIImage(contentsOf: input) else { throw NSError(domain: "InputImage", code: 1) }
  let request = VNGenerateForegroundInstanceMaskRequest()
  request.revision = 1
  let handler = VNImageRequestHandler(ciImage: image)
  try handler.perform([request])
  guard let observation = request.results?.first, !observation.allInstances.isEmpty else { throw NSError(domain: "NoForeground", code: 2) }
  let buffer = try observation.generateScaledMaskForImage(forInstances: observation.allInstances, from: handler)
  let mask = CIImage(cvPixelBuffer: buffer)
  let transparent = CIImage(color: .clear).cropped(to: image.extent)
  let result = image.applyingFilter("CIBlendWithMask", parameters: [kCIInputBackgroundImageKey: transparent, kCIInputMaskImageKey: mask])
  try context.writePNGRepresentation(of: result, to: output, format: .RGBA8, colorSpace: CGColorSpace(name: CGColorSpace.sRGB)!)
  print("OK \(input.lastPathComponent) \(observation.allInstances.count) foreground objects")
 } catch { fputs("FAILED \(input.path): \(error)\n", stderr); exit(1) }
}
