import type { Metadata } from "next";
import FuelBoliviaDashboard from "@/app/components/FuelBoliviaDashboard";
export const metadata:Metadata={title:"Combustibles en Bolivia · Panel nacional",description:"Mapa de Bolivia, litros reportados por departamento y evolución del abastecimiento con fuente ANH."};
export default function Page(){return <FuelBoliviaDashboard/>}
