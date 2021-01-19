import React from "react";
import "./App.css";
import TorusSdk from "@toruslabs/torus-direct-web-sdk";
import {
  ecsign,
  hashPersonalMessage,
  toRpcSig
} from "ethereumjs-util";
import axios from 'axios';

const GOOGLE = "google";
const FACEBOOK = "facebook";
const REDDIT = "reddit";
const DISCORD = "discord";
const TWITCH = "twitch";
const GITHUB = "github";
const APPLE = "apple";
const LINKEDIN = "linkedin";
const TWITTER = "twitter";
const WEIBO = "weibo";
const LINE = "line";
const EMAIL_PASSWORD = "email_password";
const PASSWORDLESS = "passwordless";
const HOSTED_EMAIL_PASSWORDLESS = "hosted_email_passwordless";
const HOSTED_SMS_PASSWORDLESS = "hosted_sms_passwordless";

const AUTH_DOMAIN = "https://torus-test.auth0.com";

const verifierMap = {
  [GOOGLE]: {
    name: "Google",
    typeOfLogin: "google",
    clientId: "221898609709-obfn3p63741l5333093430j3qeiinaa8.apps.googleusercontent.com",
    verifier: "google-lrc",
  },
  [FACEBOOK]: { name: "Facebook", typeOfLogin: "facebook", clientId: "617201755556395", verifier: "facebook-lrc" },
  [REDDIT]: { name: "Reddit", typeOfLogin: "reddit", clientId: "YNsv1YtA_o66fA", verifier: "torus-reddit-test" },
  [TWITCH]: { name: "Twitch", typeOfLogin: "twitch", clientId: "f5and8beke76mzutmics0zu4gw10dj", verifier: "twitch-lrc" },
  [DISCORD]: { name: "Discord", typeOfLogin: "discord", clientId: "682533837464666198", verifier: "discord-lrc" },
  [EMAIL_PASSWORD]: {
    name: "Email Password",
    typeOfLogin: "email_password",
    clientId: "sqKRBVSdwa4WLkaq419U7Bamlh5vK1H7",
    verifier: "torus-auth0-email-password",
  },
  [PASSWORDLESS]: {
    name: "Passwordless",
    typeOfLogin: "passwordless",
    clientId: "P7PJuBCXIHP41lcyty0NEb7Lgf7Zme8Q",
    verifier: "torus-auth0-passwordless",
  },
  [APPLE]: { name: "Apple", typeOfLogin: "apple", clientId: "m1Q0gvDfOyZsJCZ3cucSQEe9XMvl9d9L", verifier: "torus-auth0-apple-lrc" },
  [GITHUB]: { name: "Github", typeOfLogin: "github", clientId: "PC2a4tfNRvXbT48t89J5am0oFM21Nxff", verifier: "torus-auth0-github-lrc" },
  [LINKEDIN]: { name: "Linkedin", typeOfLogin: "linkedin", clientId: "59YxSgx79Vl3Wi7tQUBqQTRTxWroTuoc", verifier: "torus-auth0-linkedin-lrc" },
  [TWITTER]: { name: "Twitter", typeOfLogin: "twitter", clientId: "A7H8kkcmyFRlusJQ9dZiqBLraG2yWIsO", verifier: "torus-auth0-twitter-lrc" },
  [WEIBO]: { name: "Weibo", typeOfLogin: "weibo", clientId: "dhFGlWQMoACOI5oS5A1jFglp772OAWr1", verifier: "torus-auth0-weibo-lrc" },
  [LINE]: { name: "Line", typeOfLogin: "line", clientId: "WN8bOmXKNRH1Gs8k475glfBP5gDZr9H1", verifier: "torus-auth0-line-lrc" },
  [HOSTED_EMAIL_PASSWORDLESS]: {
    name: "Hosted Email Passwordless",
    typeOfLogin: "jwt",
    clientId: "P7PJuBCXIHP41lcyty0NEb7Lgf7Zme8Q",
    verifier: "torus-auth0-passwordless",
  },
  [HOSTED_SMS_PASSWORDLESS]: {
    name: "Hosted SMS Passwordless",
    typeOfLogin: "jwt",
    clientId: "nSYBFalV2b1MSg5b2raWqHl63tfH3KQa",
    verifier: "torus-auth0-sms-passwordless",
  },
};

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      selectedVerifier: GOOGLE,
      torusdirectsdk: null,
      loginHint: "",
      consoleText: "",
      accessToken: ""
    };

    this.signFx = this.signFx.bind(this)
  }

  componentDidMount = async () => {
    try {
      const torusdirectsdk = new TorusSdk({
        baseUrl: `${window.location.origin}/serviceworker`,
        enableLogging: true,
        network: "testnet", // details for test net
      });

      await torusdirectsdk.init({ skipSw: false });

      this.setState({ torusdirectsdk: torusdirectsdk });
    } catch (error) {
      console.error(error, "mounted caught");
    }
  };

  login = async (e) => {
    e.preventDefault();
    const { selectedVerifier, torusdirectsdk } = this.state;

    try {
      const jwtParams = this._loginToConnectionMap()[selectedVerifier] || {};
      const { typeOfLogin, clientId, verifier } = verifierMap[selectedVerifier];
      const loginDetails = await torusdirectsdk.triggerLogin({
        typeOfLogin,
        verifier,
        clientId,
        jwtParams,
      });

      const { publicAddress, privateKey } = loginDetails;
      // sign data
      const data = this.signFx(publicAddress.toLowerCase(), privateKey);

      // login to nft server
      axios({
        method: 'POST',
        url: 'http://localhost:35001/nft-admin/public/login-torus',
        headers: {
          'Content-Type': 'application/json'
        },
        data
      }).then((rs) => {
        console.log('rs ', rs)
        this.setState({
          accessToken: rs.data.result.accessToken,
          consoleText: typeof loginDetails === "object" ? JSON.stringify(loginDetails) : loginDetails
        });
      }).catch(error => {
        console.log('error ', error)
      })

      
    } catch (error) {
      console.error(error, "login caught");
    }
  };

  signFx = (address, privateKey) => {
    const timeStamp = new Date().getTime();
    const seed = `${address}_${timeStamp}`;

    const key = Buffer.from(privateKey, 'hex');
    const sig = ecsign(hashPersonalMessage(Buffer.from(seed)), key);
    const sign = toRpcSig(sig.v, sig.r, sig.s);
    return {
      "address": address,
      "sign": sign,
      "timestamp": timeStamp
    }
  }

  _loginToConnectionMap = () => {
    const { loginHint } = this.state;
    return {
      [EMAIL_PASSWORD]: { domain: AUTH_DOMAIN },
      [PASSWORDLESS]: { domain: AUTH_DOMAIN, login_hint: loginHint },
      [HOSTED_EMAIL_PASSWORDLESS]: { domain: AUTH_DOMAIN, verifierIdField: "name", connection: "", isVerifierIdCaseSensitive: false },
      [HOSTED_SMS_PASSWORDLESS]: { domain: AUTH_DOMAIN, verifierIdField: "name", connection: "" },
      [APPLE]: { domain: AUTH_DOMAIN },
      [GITHUB]: { domain: AUTH_DOMAIN },
      [LINKEDIN]: { domain: AUTH_DOMAIN },
      [TWITTER]: { domain: AUTH_DOMAIN },
      [WEIBO]: { domain: AUTH_DOMAIN },
      [LINE]: { domain: AUTH_DOMAIN },
    };
  };

  render() {
    const { selectedVerifier, loginHint, consoleText, accessToken } = this.state;
    let emailField = "";

    if (selectedVerifier === PASSWORDLESS) {
      emailField = (
        <div style={{ marginTop: "20px" }}>
          <input type="email" value={loginHint} onChange={(e) => this.setState({ loginHint: e.target.value })} placeholder="Enter your email" />
        </div>
      );
    }

    return (
      <div className="App">
        <form onSubmit={this.login}>
          <div>
            <span style={{ marginRight: "10px" }}>Verifier:</span>
            <select value={selectedVerifier} onChange={(e) => this.setState({ selectedVerifier: e.target.value })}>
              {Object.keys(verifierMap).map((login) => (
                <option value={login} key={login.toString()}>
                  {verifierMap[login].name}
                </option>
              ))}
            </select>
          </div>
          {emailField}
          <div style={{ marginTop: "20px" }}>
            <button>Login with Torus</button>
          </div>
        </form>
        <div className="console">
          <p>{consoleText}</p>
        </div>
        <div className="access-token">
          <p>{accessToken}</p>
        </div>
      </div>
    );
  }
}

export default App;
