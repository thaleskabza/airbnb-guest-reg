// components/FileImagePreview.tsx
"use client";
import { useState } from "react";


type Props = {
    label: string;
    onEncoded: (dataUrl: string) => void;
    capture?: "user" | "environment";
};


export default function FileImagePreview({ label, onEncoded, capture }: Props) {
    const [preview, setPreview] = useState<string>("");


    const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            const dataUrl = reader.result as string;
            setPreview(dataUrl);
            onEncoded(dataUrl);
        };
        reader.readAsDataURL(file);
    };


    return (
        <div className="stack">
            <label>{label}</label>
            <input type="file" accept="image/*" capture={capture} onChange={onFile} />
            {preview && <img src={preview} alt="preview" style={{ maxWidth: "100%", borderRadius: 8, border: "1px solid #eee" }} />}
        </div>
    );
}