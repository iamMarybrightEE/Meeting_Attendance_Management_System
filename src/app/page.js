import Image from "next/image";
import { redirect } from 'next/navigation'
import "./colors.css";
import LoginForm from "../modules/userManagement/forms/loginForm";


export default function Home() {
  // redirect('/login')

  return (
    <div className="">
      <main className="bg-animated-gradient lg:grid grid-cols-2 min-h-screen  items-center justify-center w-full  text-center">
        <div className="hidden bg-background h-full w-full lg:flex flex-col items-center justify-center">
          {/* Animated background shapes */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[10%] left-[10%] w-64 h-64 rounded-full bg-white/5 animate-morph" />
          <div className="absolute bottom-[10%] right-[5%] w-48 h-48 rounded-full bg-white/5 animate-morph delay-500" />
          <div className="absolute top-[60%] left-[50%] w-32 h-32 rounded-full bg-white/5 animate-float-slow" />
        </div>
          <Image
            src="/URA-logo.png"
            alt="Logo"
            width={400}
            height={400}
            className="mb-4"
            priority
          />
        </div>
        <LoginForm/>
      </main>
    </div>
  );
}


