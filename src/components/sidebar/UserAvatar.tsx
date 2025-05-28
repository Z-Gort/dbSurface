import { useKindeBrowserClient } from "@kinde-oss/kinde-auth-nextjs";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";

export function UserAvatar() {
  const { user } = useKindeBrowserClient();

  return (
    <Avatar className="h-8 w-8">
      <AvatarImage src={user?.picture} />
      <AvatarFallback
        className="
          bg-gradient-to-br
          from-rose-700 
          to-rose-500 
          text-white
          flex items-center justify-center
          rounded-full
        "
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={0.8}
          stroke="currentColor"
          className="size-10"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
          />
        </svg>
      </AvatarFallback>
    </Avatar>
  );
}
