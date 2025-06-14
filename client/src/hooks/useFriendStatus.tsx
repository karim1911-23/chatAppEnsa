import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';

import { RootState } from '../redux/store';
import { checkFriend, setFriend } from '../services/userService';

const useFriendStatus = (id: string) => {
    const user = useSelector((state: RootState) => state.auth.user);
    const [isFriend, setIsFriend] = useState<boolean>(false);
    const [isPending, setIsPending] = useState<boolean>(true);

    useEffect(() => {
        if (!user?.id || !id) {
            setIsPending(false);
            return;
        }

        setIsPending(true);
        const fetchIsFriend = async () => {
            try {
                const result = await checkFriend(user.id, id);
                setIsFriend(result);
            } catch (error) {
                console.error("Error checking friend status:", error);
                setIsFriend(false);
            } finally {
                setIsPending(false);
            }
        }

        fetchIsFriend();
    }, [user?.id, id]);

    const addFriend = async () => {
        if (!user?.id) return;
        try {
            await setFriend(user.id, id, true);
            setIsFriend(true);
        } catch (error) {
            console.error("Error adding friend:", error);
        }
    }

    const removeFriend = async () => {
        if (!user?.id) return;
        try {
            await setFriend(user.id, id, false);
            setIsFriend(false);
        } catch (error) {
            console.error("Error removing friend:", error);
        }
    }

    return { isPending, isFriend, addFriend, removeFriend };
}

export default useFriendStatus;