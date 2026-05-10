import { redirect } from 'next/navigation'
import { auth } from "@/lib/auth"
import {headers} from "next/headers";
import {Button, Link} from "@mui/material";

export default async function Home() {
    const session = await auth.api.getSession({
        headers: await headers()
    })

    if (!session) {
        return (
            <div className="flex flex-col items-center justify-center w-full">
                <h1 className="text-4xl font-bold text-gray-900">Locus Point</h1>
                <div className="flex gap-4 mt-8">
                    <Button>
                        <Link href="/signup">Sign Up</Link>
                    </Button>
                    <Button>
                        <Link href="/login">Login</Link>
                    </Button>
                </div>
            </div>
        )
    }

    redirect('/locations')
}