import { useKindeAuth } from "@kinde-oss/kinde-auth-react";
import { LogoutLink } from "@kinde-oss/kinde-auth-react/components";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { Button } from "../ui/button";
import { LogOut } from "lucide-react";
import { trpc } from "~/lib/client";
import { useRouter } from "next/navigation";
import { ConfirmDeleteAlertDialog } from "../projections/ConfirmDeleteAlertDialog";

export function UserAvatar() {
  const { user, logout } = useKindeAuth();
  const router = useRouter();
  const deleteUser = trpc.users.deleteUser.useMutation({
    onSuccess: () => {
      void logout();
    },
  });
  const deleteUserAssets = trpc.users.deleteUserAssets.useMutation();

  const handleDelete = async () => {
    void deleteUserAssets.mutate();
    deleteUser.mutate();
  };

  const DefaultFallback = () => (
    <AvatarFallback className="flex items-center justify-center rounded-full bg-gradient-to-br from-rose-700 to-rose-500 text-white">
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
  );

  return (
    <Popover>
      <PopoverTrigger>
        <Avatar className="h-8 w-8">
          <AvatarImage src={user?.picture} />
          <DefaultFallback />
        </Avatar>
      </PopoverTrigger>
      <PopoverContent className="w-fit p-4">
        {user?.email && (
          <>
            <p className="font-small text-sm">{user?.email}</p>
            <span className="my-2 block h-px w-full bg-gray-300" />
          </>
        )}
        {user?.givenName && (
          <>
            <p className="font-small text-sm">{user?.givenName}</p>
            <span className="my-2 block h-px w-full bg-gray-300" />
          </>
        )}

        <div className="mt-3 flex justify-end">
          <ConfirmDeleteAlertDialog
            onDelete={handleDelete}
            title={"Are you sure you want to delete your account?"}
            description={
              "This action cannot be undone and will remove all data associated with your account."
            }
            trigger={
              <Button variant="ghost" size="sm" className="mr-4 text-red-500">
                Delete Account
              </Button>
            }
          ></ConfirmDeleteAlertDialog>
          <LogoutLink>
            <Button variant="secondary" size="sm">
              <LogOut className="h-4 w-4" /> Log out
            </Button>
          </LogoutLink>
        </div>
      </PopoverContent>
    </Popover>
  );
}
