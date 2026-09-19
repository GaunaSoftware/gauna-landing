import Foundation
import PDFKit
import CoreGraphics
import AppKit

// Native macOS PDFKit/CoreGraphics, not a user-agent or screen-size simulation.
// This does not claim an on-device iPhone/Gmail test.
let originalURL = URL(fileURLWithPath: "assets/guides/deca-2026-v2.1-original.pdf")
let fixedURL = URL(fileURLWithPath: "assets/guides/prepared/guia-deca-2026-gauna-v2.1.1.pdf")
let original = PDFDocument(url: originalURL)
let originalCG = CGPDFDocument(originalURL as CFURL)
print("APPLE BEFORE: PDFKit pages=\(original?.pageCount ?? 0), CoreGraphics pages=\(originalCG?.numberOfPages ?? 0)")
guard let document = PDFDocument(url: fixedURL), document.pageCount == 28, !document.isLocked,
      let core = CGPDFDocument(fixedURL as CFURL), core.numberOfPages == 28 else {
    fatalError("Corrected document did not open in native Apple PDF engines")
}
let proof = URL(fileURLWithPath: "test-output/pdf-apple", isDirectory: true)
try FileManager.default.createDirectory(at: proof, withIntermediateDirectories: true)
for index in 0..<28 {
    guard let page = document.page(at: index), let text = page.string, text.count > 40,
          let cgPage = core.page(at: index + 1) else { fatalError("Missing page or text: \(index + 1)") }
    let width = 595, height = 842
    guard let context = CGContext(data: nil, width: width, height: height, bitsPerComponent: 8,
                                  bytesPerRow: width * 4, space: CGColorSpaceCreateDeviceRGB(),
                                  bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue) else { fatalError("Bitmap allocation failed") }
    let box = CGRect(x: 0, y: 0, width: width, height: height)
    context.setFillColor(CGColor(gray: 1, alpha: 1))
    context.fill(box)
    context.concatenate(cgPage.getDrawingTransform(.mediaBox, rect: box, rotate: 0, preserveAspectRatio: true))
    context.drawPDFPage(cgPage)
    context.flush()
    guard let data = context.data, let image = context.makeImage() else { fatalError("Missing rendered data") }
    let bytes = data.bindMemory(to: UInt8.self, capacity: width * height * 4)
    var ink = 0
    for i in stride(from: 0, to: width * height * 4, by: 4) {
        if bytes[i] < 230 || bytes[i + 1] < 230 || bytes[i + 2] < 230 { ink += 1 }
    }
    guard ink > 1000 else { fatalError("Blank native Apple rendering on page \(index + 1)") }
    if [0, 10, 27].contains(index) {
        let rep = NSBitmapImageRep(cgImage: image)
        guard let png = rep.representation(using: .png, properties: [:]) else { fatalError("PNG failed") }
        try png.write(to: proof.appendingPathComponent("page-\(index + 1).png"))
    }
    print("APPLE AFTER page \(index + 1): \(text.count) text characters; \(ink) non-white pixels")
}
print("APPLE PASS: corrected PDF opens and all 28 pages render with text in PDFKit/CoreGraphics on macOS.")
