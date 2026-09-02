import Script from "next/script";
export default function GuidesLayout({ children }: { children: React.ReactNode }) { return <><Script id="adsense-editorial" async strategy="afterInteractive" crossOrigin="anonymous" src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7639179482151025" />{children}</>; }
