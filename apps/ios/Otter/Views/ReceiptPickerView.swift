import AVFoundation
import OtterKit
import PhotosUI
import SwiftUI
import UIKit

/// Use the native photo library without requesting access to the complete library.
@MainActor
struct ReceiptPickerView: View {
    @Binding var photo: Data?
    @Binding var removeExisting: Bool
    let request: ReceiptRequestState
    private var loading: Bool { request.loading }
    let existingPhoto: Data?
    let hasExisting: Bool
    let sessionGeneration: UUID
    @State private var selection: PhotosPickerItem?
    @State private var camera = false
    @State private var issue: String?

    var body: some View {
        let hasPhoto = photo != nil
        let previewLabel: LocalizedStringKey = hasPhoto ? "待上傳收據預覽" : "目前收據預覽"
        VStack(alignment: .leading, spacing: 12) {
            if let data = photo ?? (removeExisting ? nil : existingPhoto),
                let image = UIImage(data: data)
            {
                Image(uiImage: image).resizable().scaledToFit().frame(maxHeight: 260)
                    .accessibilityLabel(Text(previewLabel))
            } else if hasExisting && !removeExisting {
                Text("此支出已有收據。若預覽無法載入，仍可選擇替換或刪除。")
            }
            PhotosPicker(
                selection: $selection, matching: .images, preferredItemEncoding: .compatible
            ) {
                Label(
                    hasExisting || hasPhoto
                        ? LocalizedStringKey("從相簿替換收據") : LocalizedStringKey("選擇收據照片"),
                    systemImage: "photo")
            }.disabled(loading)
            Button {
                Task { await openCamera() }
            } label: {
                Label("拍攝收據", systemImage: "camera")
            }.disabled(loading)
            if photo != nil {
                Button("移除所選照片", role: .destructive) {
                    photo = nil
                    selection = nil
                    request.invalidate()
                }
            }
            if hasExisting {
                Toggle("儲存時刪除目前收據", isOn: $removeExisting)
                    .onChange(of: removeExisting) { _, value in
                        if value {
                            photo = nil
                            selection = nil
                            request.invalidate()
                        }
                    }
            }
            if loading { ProgressView("正在處理照片…") }
            if let issue { Text(issue).foregroundStyle(.red) }
        }
        .sheet(isPresented: $camera, onDismiss: { request.invalidate() }) {
            ReceiptCameraView { image in
                guard camera else { return }
                camera = false
                request.invalidate()
                guard let image else { return }
                accept(image)
            }.ignoresSafeArea()
        }
        .onChange(of: selection) { _, item in
            guard let item else {
                request.invalidate()
                return
            }
            let generation = sessionGeneration
            let requestID = request.begin()
            issue = nil
            Task { @MainActor in
                defer { request.finish(requestID) }
                do {
                    guard let data = try await item.loadTransferable(type: Data.self),
                        generation == sessionGeneration, request.id == requestID,
                        let image = UIImage(data: data)
                    else {
                        if request.id == requestID {
                            issue = NativeLocalization.string("無法讀取圖片。請選擇其他照片。")
                        }
                        return
                    }
                    accept(image)
                } catch {
                    if generation == sessionGeneration && request.id == requestID {
                        issue = NativeLocalization.string("無法讀取圖片：\(error.localizedDescription)")
                    }
                }
            }
        }
        .onChange(of: sessionGeneration) { _, _ in
            request.invalidate()
            selection = nil
            photo = nil
            camera = false
        }
        .onDisappear {
            request.invalidate()
        }
    }
    private func accept(_ image: UIImage) {
        do {
            photo = try ReceiptImageEncoder.jpegData(image)
            removeExisting = false
            issue = nil
        } catch { issue = NativeLocalization.string("圖片無效，或轉換後的 JPEG 超過 5 MB。請選擇其他圖片。") }
    }
    private func openCamera() async {
        guard UIImagePickerController.isSourceTypeAvailable(.camera) else {
            issue = NativeLocalization.string("此裝置無法使用相機。請從相簿選擇收據。")
            return
        }
        guard Bundle.main.object(forInfoDictionaryKey: "NSCameraUsageDescription") != nil else {
            issue = NativeLocalization.string("此版本未設定相機權限說明。請從相簿選擇收據。")
            return
        }
        let generation = sessionGeneration
        let requestID = request.begin()
        let granted: Bool
        switch AVCaptureDevice.authorizationStatus(for: .video) {
        case .authorized: granted = true
        case .notDetermined: granted = await AVCaptureDevice.requestAccess(for: .video)
        case .denied, .restricted: granted = false
        @unknown default: granted = false
        }
        guard generation == sessionGeneration, request.id == requestID else { return }
        if granted {
            camera = true
            issue = nil
        } else {
            request.finish(requestID)
            issue = NativeLocalization.string("相機權限已拒絕或受限制。可在 iOS 設定中允許相機，或改從相簿選擇。")
        }
    }
}

@MainActor
private struct ReceiptCameraView: UIViewControllerRepresentable {
    let onResult: @MainActor (UIImage?) -> Void
    func makeCoordinator() -> Coordinator { Coordinator(onResult: onResult) }
    func makeUIViewController(context: Context) -> UIImagePickerController {
        let picker = UIImagePickerController()
        picker.sourceType = .camera
        picker.mediaTypes = ["public.image"]
        picker.delegate = context.coordinator
        return picker
    }
    func updateUIViewController(_ uiViewController: UIImagePickerController, context: Context) {}
    @MainActor
    final class Coordinator: NSObject, UINavigationControllerDelegate,
        UIImagePickerControllerDelegate
    {
        let onResult: @MainActor (UIImage?) -> Void
        init(onResult: @escaping @MainActor (UIImage?) -> Void) { self.onResult = onResult }
        func imagePickerController(
            _ picker: UIImagePickerController,
            didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey: Any]
        ) {
            onResult(info[.originalImage] as? UIImage)
        }
        func imagePickerControllerDidCancel(_ picker: UIImagePickerController) { onResult(nil) }
    }
}
