import OtterKit
import SwiftUI
import UIKit

struct PrintSettlementView: View {
    let payload: TripPayload
    @State private var presenting = false
    @State private var issue: String?

    var body: some View {
        List {
            Section("列印內容") {
                Text(verbatim: payload.trip.name).font(.headline)
                    .fixedSize(horizontal: false, vertical: true)
                Text("列印全部參與者、餘額、建議結算、支出及可取得的付款紀錄。內容會自動分頁，長名稱會換行。")
                if payload.trip.settlementPayments == nil {
                    Text("此分享未提供付款明細，不會列印隱藏資料。")
                }
                Text("不包含登入憑證、分享連結或操作按鈕。")
            }
            Button("開啟系統列印") {
                if UIPrintInteractionController.isPrintingAvailable {
                    presenting = true
                } else {
                    issue = NativeLocalization.string("此裝置目前無法使用系統列印。")
                }
            }
            if let issue { Text(verbatim: issue).foregroundStyle(.red) }
        }
        .navigationTitle("列印結算資料")
        .sheet(isPresented: $presenting) {
            NativeSettlementPrintSheet(
                html: CSV.printHTML(payload: payload), jobName: payload.trip.name
            ) { error in
                issue = error
                presenting = false
            }
            .interactiveDismissDisabled()
        }
    }
}

private struct NativeSettlementPrintSheet: UIViewControllerRepresentable {
    let html: String
    let jobName: String
    let completed: @MainActor (String?) -> Void

    func makeUIViewController(context: Context) -> SettlementPrintController {
        SettlementPrintController(html: html, jobName: jobName, completed: completed)
    }
    func updateUIViewController(_ uiViewController: SettlementPrintController, context: Context) {}
    static func dismantleUIViewController(
        _ uiViewController: SettlementPrintController, coordinator: ()
    ) {
        uiViewController.stop()
    }
}

private final class SettlementPrintController: UIViewController {
    private let html: String
    private let jobName: String
    private let completed: @MainActor (String?) -> Void
    private var started = false
    private var printer: UIPrintInteractionController?

    init(html: String, jobName: String, completed: @MainActor @escaping (String?) -> Void) {
        self.html = html
        self.jobName = jobName
        self.completed = completed
        super.init(nibName: nil, bundle: nil)
    }
    required init?(coder: NSCoder) { nil }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .systemBackground
    }
    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        guard !started else { return }
        started = true
        let controller = UIPrintInteractionController.shared
        let info = UIPrintInfo(dictionary: nil)
        info.outputType = .general
        info.jobName = jobName
        controller.printInfo = info
        controller.printFormatter = UIMarkupTextPrintFormatter(markupText: html)
        printer = controller
        let shown = controller.present(from: view.bounds, in: view, animated: true) {
            [weak self] controller, _, error in
            controller.printFormatter = nil
            self?.printer = nil
            self?.completed(error?.localizedDescription)
        }
        if !shown {
            controller.printFormatter = nil
            printer = nil
            completed(NativeLocalization.string("無法開啟系統列印。"))
        }
    }
    func stop() {
        guard let printer else { return }
        printer.dismiss(animated: false)
        printer.printFormatter = nil
        self.printer = nil
    }
}
