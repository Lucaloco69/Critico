import { Accessor } from "solid-js";
import { UserProfileComputed } from "../../hooks/profile/useProfile";

interface ProfileInfoProps {
  user: Accessor<UserProfileComputed | null>;  // ✅ null erlauben
}

export default function ProfileInfo(props: ProfileInfoProps) {
  const u = props.user();
  if (!u) return null;  // ✅ Guard clause
  
  return (
    <div>
      <h1 class="text-3xl font-bold text-white">
        {u.name} {u.surname}
      </h1>
      <p class="text-gray-300">{u.email}</p>
    </div>
  );
}
