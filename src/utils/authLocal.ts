export function getCurrentUid(): string {
  return localStorage.getItem("current_user_uid") ?? "";
}

export function setCurrentUid(uid: string | null) {
  if (uid) localStorage.setItem("current_user_uid", uid);
  else localStorage.removeItem("current_user_uid");
}
