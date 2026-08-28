"use client";

import { QRCodeSVG } from "qrcode.react";
import { Smartphone } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function QrCodeCard({ url }: { url: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Smartphone className="h-4 w-4 text-amber-700" />
          スマホでアクセス
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-3">
        <QRCodeSVG value={url} size={140} />
        <p className="text-xs text-gray-500 text-center break-all">{url}</p>
      </CardContent>
    </Card>
  );
}
