import type { Metadata } from "next"
import "./globals.css"
import { Inter } from "next/font/google"


const inter = Inter({ subsets: ["latin"] })


export const metadata: Metadata = {
title: "NORSU HRM • Home",
description:
"Providing comprehensive HR support for faculty and staff—from recruitment and onboarding to development, wellness, and employee services.",
}


export default function RootLayout({ children }: { children: React.ReactNode }) {
return (
<html lang="en" suppressHydrationWarning>
<body className={inter.className}>{children}</body>
</html>
)
}