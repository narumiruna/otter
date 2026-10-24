import OtterKit
import UIKit

@MainActor
enum ReceiptImageEncoder {
    static let maximumBytes = 5 * 1024 * 1024

    static func jpegData(_ image: UIImage) throws -> Data {
        // Rendering normalizes camera orientation and converts HEIC into supported JPEG.
        let longest = max(image.size.width, image.size.height)
        guard longest.isFinite, longest > 0, image.size.width > 0, image.size.height > 0 else {
            throw APIError.invalidReceipt
        }
        let factor = min(1, 3000 / longest)
        let size = CGSize(
            width: max(1, image.size.width * factor), height: max(1, image.size.height * factor))
        let format = UIGraphicsImageRendererFormat()
        format.scale = 1
        format.opaque = true
        let normalized = UIGraphicsImageRenderer(size: size, format: format).image { context in
            UIColor.white.setFill()
            context.fill(CGRect(origin: .zero, size: size))
            image.draw(in: CGRect(origin: .zero, size: size))
        }
        guard let bytes = normalized.jpegData(compressionQuality: 0.85), !bytes.isEmpty,
            bytes.count <= maximumBytes
        else { throw APIError.invalidReceipt }
        return bytes
    }
}
