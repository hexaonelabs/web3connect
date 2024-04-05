import html from "./dialogElement.html?raw";
import css from "./dialogElement.css?raw";
import { DEFAULT_SIGNIN_METHODS, SigninMethod } from "../../constant";
import { promptElement } from "../prompt-element/prompt-element";

// export web component with shadowdom
class HexaSigninDialogElement extends HTMLElement {
  constructor() {
    super();
    const integrator = this.getAttribute("integrator")
      ? "Sign in to" + this.getAttribute("integrator")
      : "Sign in using HexaConnect";
    // get enabled signin methods. If not provided, all methods are enabled by default
    const enabledMethods = this.getAttribute("signin-methods")
      ? this.getAttribute("signin-methods")
          ?.split(",")
          ?.filter(
            (method): method is typeof DEFAULT_SIGNIN_METHODS[number] =>
              method !== undefined
          ) || DEFAULT_SIGNIN_METHODS
      : DEFAULT_SIGNIN_METHODS;
    // build shadow dom
    const shadow = this.attachShadow({ mode: "open" });
    if (!shadow) {
      throw new Error("ShadowDOM not supported");
    }
    // create template element
    const template = document.createElement("template");
    template.innerHTML = `
        <style>${css}</style>
        ${html}
    `;
    // disable buttons that are not enabled
    const buttons = template.content.querySelectorAll(".buttonsList button") as NodeListOf<HTMLButtonElement>;
    buttons.forEach((button) => {
      if (!enabledMethods.includes(button.id as typeof enabledMethods[number])) {
        button.remove();
      }
    });
    // remove `or` tage if google is not enabled
    if (!enabledMethods.includes(SigninMethod.Google) || enabledMethods.includes(SigninMethod.Google) && enabledMethods.length === 1) {
      template.content.querySelector(".or")?.remove();
    }
    // finaly add template to shadow dom
    shadow.appendChild(template.content.cloneNode(true));
    // replace tags from html with variables
    const variables = [{ tag: "integrator", value: integrator }];
    variables.forEach((variable) => {
      shadow.innerHTML = shadow.innerHTML.replace(
        new RegExp(`{{${variable.tag}}}`, "g"),
        variable.value
      );
    });
  }

  public showModal(): void {
    this.shadowRoot?.querySelector("dialog")?.showModal();
  }

  public hideModal(): void {
    this.shadowRoot?.querySelector("dialog")?.close();
  }

  // manage events from shadow dom
  public connectedCallback() {
    this.shadowRoot
      ?.querySelector("dialog")
      ?.addEventListener("click", async (event) => {
        const button = (event.target as HTMLElement).closest("button");
        if (!button) return;
        // handle cancel
        if (button.id === "cancel") {
          this.dispatchEvent(
            new CustomEvent("connect", {
              detail: button.id,
            })
          );
          // stop further execution of code
          // as we don't want to show loading on cancel
          // and we don't want to show connected on cancel.
          // This will trigger the event and close the dialog
          return;
        }
        // disable all btns. This will prevent multiple clicks.
        // We dont need to enable them back as dialog will be closed and removed from DOM
        [
          ...((this.shadowRoot?.querySelectorAll(".buttonsList button") ||
          []) as HTMLButtonElement[]),
        ].forEach((buttonElement) => (buttonElement.disabled = true));
        // emiting custome event to SDK
        switch (button.id) {
          case "connect-google":
            this.dispatchEvent(
              new CustomEvent("connect", {
                detail: button.id,
              })
            );
            break;
          case "connect-email":
            this.dispatchEvent(
              new CustomEvent("connect", {
                detail: button.id,
              })
            );
            break;
          case "connect-wallet":
            this.dispatchEvent(
              new CustomEvent("connect", {
                detail: button.id,
              })
            );
            break;
        }
        // styling button as loading
        button.innerHTML = `Connecting...`;
      });
  }

  public async toggleIconAsCheck(buttonElementId: string): Promise<boolean> {
    // toggle with transition animation
    const button = this.shadowRoot?.getElementById(buttonElementId);
    if (button) {
      button.innerHTML = `
      <svg 
      xmlns="http://www.w3.org/2000/svg"
      fill="#00c853"
      width="18" height="18" viewBox="0 0 24 24">
        <path d="M20.285 2l-11.285 11.567-5.286-5.011-3.714 3.716 9 8.728 15-15.285z"/>
      </svg>
        <span style="color:#00c853;">Connected</span>
      `;
      return new Promise((resolve) => {
        const t = setTimeout(() => {
          clearTimeout(t);
          resolve(true);
        }, 1500);
      });
    } else {
      throw new Error("Button not found");
    }
  }

  public async promptPassword() {
    const value = await promptElement(
      this.shadowRoot?.querySelector("dialog .buttonsList") as HTMLElement
    );
    return value;
  }
}

customElements.define("hexa-signin-dialog", HexaSigninDialogElement);
export { HexaSigninDialogElement };
