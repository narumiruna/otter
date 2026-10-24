import Foundation

public enum APIError: Error, LocalizedError, Sendable {
    case invalidServer
    case invalidToken
    case invalidIdentifier
    case invalidAmount(currency: Currency)
    case missingVersion
    case unauthorized
    case invalidResponse
    case sessionRequired
    case invalidReceipt
    case http(status: Int, message: String)

    public var errorDescription: String? {
        switch self {
        case .invalidServer:
            NativeLocalization.string("請輸入 HTTPS 網站網址，不含路徑、帳密或查詢參數。本機開發可使用 http://localhost:17463。")
        case .invalidToken:
            NativeLocalization.string("請輸入有效的 API token。")
        case .invalidIdentifier:
            NativeLocalization.string("資料識別碼無效，請重新載入。")
        case .invalidAmount(let currency):
            NativeLocalization.string(
                "請輸入大於零的金額；\(currency.rawValue) 最多支援 \(currency.minorUnits) 位小數。")
        case .missingVersion:
            NativeLocalization.string("缺少支出版本，請重新載入後再試。")
        case .unauthorized:
            NativeLocalization.string("登入已到期、撤銷或無效，請重新登入。")
        case .invalidResponse:
            NativeLocalization.string("伺服器回傳的資料無法讀取，請確認網址與伺服器版本。")
        case .sessionRequired:
            NativeLocalization.string("此操作需要完整帳號登入，不能使用 API token 或分享憑證。")
        case .invalidReceipt:
            NativeLocalization.string("請選擇不超過 5 MB 的 JPEG、PNG 或 WebP 收據圖片。")
        case .http(let status, let message):
            switch status {
            case 403: message
            case 412:
                NativeLocalization.string("這筆支出已被修改。請重新載入，確認最新內容後再操作。")
            default: message
            }
        }
    }
}
