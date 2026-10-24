import Foundation

/// Text rules for business inputs shared with JavaScript. These do not apply to protocol parsing.
public enum WebText {
    /// ECMAScript String.trim whitespace, not Foundation's broader whitespace set.
    public static func trim(_ value: String) -> String {
        let scalars = value.unicodeScalars
        func isWhitespace(_ scalar: Unicode.Scalar) -> Bool {
            switch scalar.value {
            case 0x0009...0x000D, 0x0020, 0x00A0, 0x1680, 0x2000...0x200A,
                0x2028, 0x2029, 0x202F, 0x205F, 0x3000, 0xFEFF:
                true
            default:
                false
            }
        }
        let start = scalars.firstIndex { !isWhitespace($0) } ?? scalars.endIndex
        let end =
            scalars[start...].lastIndex { !isWhitespace($0) }
            .map { scalars.index(after: $0) } ?? start
        return String(scalars[start..<end])
    }

    /// JavaScript compares UTF-16 code units without canonical Unicode equivalence.
    public static func equal(_ left: String, _ right: String) -> Bool {
        left.utf16.elementsEqual(right.utf16)
    }

    /// Case conversion, if required by the caller, must occur before this comparison.
    public static func contains(_ value: String, _ query: String) -> Bool {
        query.isEmpty || value.range(of: query, options: .literal) != nil
    }
}
