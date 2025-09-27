import { kv } from "@vercel/kv";


type Submission = {
    id: string;
    createdAt: number;
    data: any; // validated payload
};


// DEV fallback (in-memory). DO NOT rely on in prod.
const memory = new Map<string, Submission>();


export async function kvSet(key: string, value: Submission) {
    try {
        await kv.set(key, value);
    } catch (e) {
        memory.set(key, value);
    }
}


export async function kvGet<T = Submission>(key: string): Promise<T | null> {
    try {
        const v = await kv.get<T>(key);
        if (v) return v;
    } catch (e) {
        // fall through
    }
    return (memory.get(key) as T) || null;
}