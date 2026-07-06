import React from "react";

export default function AuthLayout({children,}:{children:React.ReactNode}){
    return(
        <div className="min-h-screen w-full">
            <header className="">
                <h1></h1>
            </header>
            <main className=" flex flex-col min-h-screen w-full">{children}</main>
        </div>
    )
}