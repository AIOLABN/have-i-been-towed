import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
 title:'HaveIBeenTowed — Find your vehicle',
 description:'A clearer next step when your car is missing. Search reviewed tow records and explore camera-based vehicle detection.',
 icons:{icon:'/favicon.svg'},
};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
