declare module 'react-qr-scanner' {
    import { Component } from 'react';

    interface QrScannerProps {
        onScan: (data: { text: string } | null) => void;
        onError: (error: any) => void;
        delay?: number;
        style?: React.CSSProperties;
        constraints?: MediaStreamConstraints;
    }

    export default class QrScanner extends Component<QrScannerProps> { }
}
