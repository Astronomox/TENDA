"use client"
import { useState } from "react";
import { addCustomer } from "@/lib/actions/customers";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default function AddCustomers(){

    const [number,setNumber] = useState("");
    const [email,setEmail] = useState("");
    const [name,setName] = useState("");

    function clearFields(){
        setEmail("");
        setName("");
        setNumber("");
    }



    return(
        <div className="flex flex-col w-full px-4 py-6 lg:px-0 lg:py-0 lg:max-w-lg">
            {/* HEADER ROW */}
            <div className="relative flex items-center justify-center mb-8">
                <Link href="/customers" className="absolute left-0 flex items-center gap-1 text-sm font-medium text-[#4A5568] hover:text-[#1A1A1A] transition-colors">
                    <ChevronLeft className="w-4 h-4" /> Back
                </Link>
                <h1 className="font-display font-extrabold text-2xl lg:text-3xl text-[#1A1A1A] tracking-tight">Add Customer</h1>
            </div>

                {/*add customer form */}
           <form action={addCustomer} className="flex flex-col w-full gap-5">

                <div className="flex flex-col w-full">
                    <label className="text-sm font-medium text-[#4A5568] mb-1.5 block">Customer name</label>
                    <input type="text" placeholder="Enter customer name" name="name" className="w-full h-12 bg-white border border-[#E8E8E4] rounded-xl px-4 text-[#1A1A1A] placeholder:text-[#A0AEC0] focus:outline-none focus:border-[#E85D04] focus:ring-2 focus:ring-[#E85D04]/10 transition"/>
                </div>


                <div className="flex flex-col w-full">
                    <label className="text-sm font-medium text-[#4A5568] mb-1.5 block">Email</label>
                    <input type="email" placeholder="Enter customer email" name="email" className="w-full h-12 bg-white border border-[#E8E8E4] rounded-xl px-4 text-[#1A1A1A] placeholder:text-[#A0AEC0] focus:outline-none focus:border-[#E85D04] focus:ring-2 focus:ring-[#E85D04]/10 transition"/>
                </div>

                <div className="flex flex-col w-full">
                    <label className="text-sm font-medium text-[#4A5568] mb-1.5 block">Phone number</label>
                    <input type="tel" placeholder="Enter customer phone number" name="number" className="w-full h-12 bg-white border border-[#E8E8E4] rounded-xl px-4 text-[#1A1A1A] placeholder:text-[#A0AEC0] focus:outline-none focus:border-[#E85D04] focus:ring-2 focus:ring-[#E85D04]/10 transition"/>
                </div>

                <button type="submit" className="bg-[#E85D04] hover:bg-[#FF8C42] active:scale-95 text-white font-semibold rounded-xl h-14 w-full transition-all shadow-[0_4px_20px_rgba(232,93,4,0.25)] mt-2">Add customer</button>

            </form>

        </div>
    )
}
