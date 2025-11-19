export const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000/api";


function authHeaders(token) {
    return {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
}

export async function followUser({ token, userId, username }) {
    const res = await fetch(`${API_BASE}/social/follow/`, {
        method: "POST",
        headers: authHeaders(token),
        body: JSON.stringify(
            userId ? { to_user_id: userId } : { username }
        ),
    });
    if (!res.ok) throw new Error("Failed to follow user");
    return res.json();
}

export async function unfollowUser({ token, userId }) {
    const res = await fetch(`${API_BASE}/social/unfollow/${userId}/`, {
        method: "DELETE",
        headers: authHeaders(token),
    });
    if (!res.ok && res.status !== 204) throw new Error("Failed to unfollow user");
}

export async function getFollowers({ token }) {
    const res = await fetch(`${API_BASE}/social/followers/`, {
        headers: authHeaders(token),
    });
    if (!res.ok) throw new Error("Failed to fetch followers");
    return res.json();
}

export async function getFollowing({ token }) {
    const res = await fetch(`${API_BASE}/social/following/`, {
        headers: authHeaders(token),
    });
    if (!res.ok) throw new Error("Failed to fetch following");
    return res.json();
}

export async function getFriends({ token }) {
    const res = await fetch(`${API_BASE}/social/friends/`, {
        headers: authHeaders(token),
    });
    if (!res.ok) throw new Error("Failed to fetch friends");
    return res.json();
}