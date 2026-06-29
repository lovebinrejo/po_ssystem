import { useEffect, useRef, useState } from "react";
import { X, RefreshCw, ScanBarcode } from "lucide-react";

function BarcodeScannerModal({ open, onClose, onScan }) {
    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const [manualValue, setManualValue] = useState("");
    const [facingMode, setFacingMode] = useState("environment");
    const [status, setStatus] = useState("Position the barcode within the frame");
    const [cameraAvailable, setCameraAvailable] = useState(true);

    useEffect(() => {
        if (!open) return;

        let detectorTimer;
        let cancelled = false;

        const start = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode },
                });
                if (cancelled) {
                    stream.getTracks().forEach((track) => track.stop());
                    return;
                }
                streamRef.current = stream;
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
                setCameraAvailable(true);

                if ("BarcodeDetector" in window) {
                    const detector = new window.BarcodeDetector();
                    detectorTimer = setInterval(async () => {
                        if (!videoRef.current) return;
                        try {
                            const barcodes = await detector.detect(videoRef.current);
                            if (barcodes.length > 0) {
                                setStatus(`Found: ${barcodes[0].rawValue}`);
                                onScan(barcodes[0].rawValue);
                            }
                        } catch {
                            // ignore transient detection errors
                        }
                    }, 400);
                } else {
                    setStatus("Live detection not supported on this browser — enter the barcode manually below");
                }
            } catch {
                setCameraAvailable(false);
                setStatus("Camera unavailable — enter the barcode manually below");
            }
        };

        start();

        return () => {
            cancelled = true;
            clearInterval(detectorTimer);
            streamRef.current?.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
        };
    }, [open, facingMode, onScan]);

    if (!open) return null;

    const handleManualSubmit = (e) => {
        e.preventDefault();
        if (manualValue.trim()) {
            onScan(manualValue.trim());
            setManualValue("");
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between px-5 py-2.5 bg-[#2c6291] text-white">
                    <h3 className="flex items-center gap-2 font-semibold">
                        <ScanBarcode size={20} />
                        Scan Barcode
                    </h3>
                    <button type="button" onClick={onClose} className="hover:opacity-80">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-5 overflow-y-auto">
                    <div className="relative bg-black rounded-lg overflow-hidden min-h-[220px] flex items-center justify-center">
                        {cameraAvailable ? (
                            <video ref={videoRef} autoPlay playsInline className="w-full h-auto block" />
                        ) : (
                            <ScanBarcode size={48} className="text-gray-500" />
                        )}
                        {cameraAvailable && (
                            <div className="absolute left-[10%] right-[10%] top-1/2 h-0.5 bg-red-500/80 shadow-[0_0_10px_rgba(255,0,0,0.5)]" />
                        )}
                    </div>

                    <p className="text-center text-sm text-gray-600 mt-3">{status}</p>

                    <form onSubmit={handleManualSubmit} className="mt-4 pt-4 border-t border-dashed border-gray-300">
                        <p className="text-sm text-gray-600 mb-2">Or enter barcode manually:</p>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                autoFocus
                                value={manualValue}
                                onChange={(e) => setManualValue(e.target.value)}
                                placeholder="Enter barcode..."
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-1 focus:ring-blue-400"
                            />
                            <button
                                type="submit"
                                className="px-4 py-2 rounded-lg bg-[#397db9] text-white text-sm font-medium hover:bg-[#2c6291]"
                            >
                                Search
                            </button>
                        </div>
                    </form>
                </div>

                <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-200">
                    <button
                        type="button"
                        onClick={() => setFacingMode((m) => (m === "environment" ? "user" : "environment"))}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm bg-gray-100 hover:bg-gray-200 text-gray-700"
                    >
                        <RefreshCw size={14} />
                        Switch Camera
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-3 py-2 rounded-lg text-sm bg-gray-100 hover:bg-gray-200 text-gray-700"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}

export default BarcodeScannerModal;
