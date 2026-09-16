import type { Metadata } from "next";
import FuelSupplyDashboard from "@/app/components/FuelSupplyDashboard";
export const metadata:Metadata={title:"Combustibles por estación",description:"Consulta saldos e historial por estación, departamento y producto."};
export default function Page(){return <FuelSupplyDashboard/>}
