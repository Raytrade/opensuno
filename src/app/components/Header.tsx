import Link from "next/link";
import Image from "next/image";
import Logo from "./Logo";

export default function Header() {
    return (
        <nav className="flex w-full justify-center border-b border-gray-300 px-4 py-4 font-mono text-sm backdrop-blur-2xl lg:px-0">
            <div className="flex w-full max-w-4xl items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xl font-medium text-indigo-900">
                    <Logo className="h-4 w-4" />
                    <Link href="/">OpenSuno</Link>
                </div>
                <div className="flex items-center justify-center gap-1 text-xs font-light text-indigo-900/90 sm:text-sm">
                    <Link className="rounded-full p-2 duration-200 hover:bg-indigo-100 lg:px-4 lg:py-3" href="/create">Studio</Link>
                    <Link className="rounded-full p-2 duration-200 hover:bg-indigo-100 lg:px-4 lg:py-3" href="/studio">My Studio</Link>
                    <Link className="rounded-full p-2 duration-200 hover:bg-indigo-100 lg:px-4 lg:py-3" href="/docs">API Docs</Link>
                    <Link className="rounded-full p-2 duration-200 hover:bg-indigo-100 lg:px-4 lg:py-3" href="/cookie">Connect</Link>
                    <a href="https://github.com/Raytrade/opensuno/" target="_blank" rel="noreferrer" className="flex items-center justify-center gap-1 rounded-full p-2 duration-200 hover:bg-indigo-100 lg:px-4 lg:py-3">
                        <Image src="/github-mark.png" alt="GitHub Logo" width={20} height={20} />
                        <span>GitHub</span>
                    </a>
                </div>
            </div>
        </nav>
    );
}
