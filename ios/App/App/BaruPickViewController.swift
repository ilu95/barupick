import UIKit
import Capacitor

class BaruPickViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(AppleSignInPlugin())
    }
}
