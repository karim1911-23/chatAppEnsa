import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

import { getFriends } from "../../../../services/userService";
import FriendBox from "./FriendBox";

const FriendsTab = () => {
  const location = useLocation();
  const [friends, setFriends] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFriends = async () => {
      try {
        setIsLoading(true);
        const result = await getFriends(location.state?.userId);
        // Make sure we're setting an array, even if the API returns null or undefined
        setFriends(result?.friends || []);
      } catch (err) {
        console.error("Error fetching friends:", err);
        setError("Failed to load friends");
      } finally {
        setIsLoading(false);
      }
    };

    fetchFriends();
  }, [location.state?.userId]);

  if (isLoading) {
    return <p>Loading friends...</p>;
  }

  if (error) {
    return <p className="text-red-500">{error}</p>;
  }

  if (!friends || friends.length === 0) {
    return <p className="text-center py-5">No friends available.</p>;
  }

  return (
    <div>
      {friends.map((friend) => {
        // Skip rendering if friend is null or undefined
        if (!friend || !friend.id) {
          return null;
        }

        return <FriendBox key={friend.id} friend={friend} />;
      })}
    </div>
  );
};

export default FriendsTab;
