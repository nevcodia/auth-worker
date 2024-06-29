import {getUserData} from 'auth-worker';
import {useCallback, useEffect, useState} from 'react';
import './App.css';
import {BASE_PATH} from "../constants";

const providerUrls: Record<string, string> = {
  google: 'https://www.googleapis.com/oauth2/v3/userinfo',
  facebook: 'https://graph.facebook.com/v9.0/me',
  twitter: 'https://api.twitter.com/2/users/me?user.fields=profile_image_url',
  reddit: 'https://oauth.reddit.com/api/v1/me',
  havelsan: 'https://infra.net/auth/userinfo',
};

function App() {
  const [result, setResult] = useState<null | {
    data: { name: string; picture: string },
    provider: string
  }>(null);

  useEffect(() => {
    if (!result) {
      getUserData().then(setResult as (data: unknown) => void, () => null);
    }
  }, []);

  const getUserInfo = useCallback(async () => {
    const userInfoUrl: string | null = result && providerUrls[result.provider];

    if (userInfoUrl) {
      await fetch('/test');
      const res = await fetch(userInfoUrl, {
        headers: {
          'X-Use-Auth': 'true',
        },
      });
      const userInfo = await res.json();

      console.log(userInfo);
    }
  }, [result]);

  return (
      <div>
        {result ? (
            <div>
              <h1>Logged in as {result.data.name}</h1>
              <img src={result.data?.picture} alt="Profile"/>
              <code>{JSON.stringify(result)}</code>
              <button onClick={getUserInfo}>Get user info</button>
              <a href={BASE_PATH + "/auth/logout"}>Logout</a>
            </div>
        ) : (
            <div>
              <a href={BASE_PATH + "/auth/login/google"}>Log in with Google</a>
              <br/>
              <a href={BASE_PATH + "/auth/login/facebook"}>Log in with Facebook</a>
              <br/>
              <a href={BASE_PATH + "/auth/login/twitter"}>Log in with Twitter</a>
              <br/>
              <a href={BASE_PATH + "/auth/login/reddit"}>Log in with Reddit</a>
              <br/>
              <a href={BASE_PATH + "/auth/login/havelsan"}>Log in with Havelsan</a>
            </div>
        )}
      </div>
  );
}

export default App;
