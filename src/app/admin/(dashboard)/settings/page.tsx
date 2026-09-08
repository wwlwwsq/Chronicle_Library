import { getSession } from "@/lib/auth";
import SettingsForm from "@/components/admin/SettingsForm";

export const dynamic = "force-dynamic";

export const metadata = { title: "设置" };

export default async function Page() {
  const session = await getSession();
  return <SettingsForm username={session?.username || "admin"} />;
}
