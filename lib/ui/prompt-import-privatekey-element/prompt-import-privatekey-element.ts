import Crypto from "../../providers/crypto/crypto";
import { CheckboxElement } from "../checkbox-element/checkbox-element";
import { promptPasswordElement } from "../prompt-password-element/prompt-password-element";

export const promptImportPrivatekeyElement = async (
  ref: HTMLElement
): Promise<{
  privateKey: string;
  secret: string;
}> => {
  const container = document.createElement('div');
  container.classList.add('prompt-container');
  ref.after(container);
  ref.style.display = 'none';
  container.innerHTML = `
    <div class="prompt__import_file">
      <p>
        <b>Import Privatekey backup file</b>
      </p>
      <div class="prompt__import_file__result"></div>
      ${CheckboxElement('Encrypted backup file')}
      <button id="button__import_privatekey">
        <span>Import</span>
      </button>
      <input type="file" id="input__import_file" accept=".txt" style="display: none;">
    </div>
  `;

  const buttonImportPrivatekey = container.querySelector('#button__import_privatekey') as HTMLButtonElement;
  const inputImportFile = container.querySelector('#input__import_file') as HTMLInputElement;
  const toggleEncription = container.querySelector('#toggle__encription') as HTMLInputElement;
  
  const resutl = await new Promise<{
    privateKey: string;
    secret: string;
  }>((resolve, reject) => {
    buttonImportPrivatekey.addEventListener('click', (e) => {
      e.preventDefault();
      inputImportFile.click();
    });

    inputImportFile.addEventListener('change', async () => {
      const file = inputImportFile.files?.[0];
      if (!file) return;
      try {
        const content = await file.text();
        const isEncrypted = toggleEncription.checked;
        if (isEncrypted) {
          const secret = await promptPasswordElement(container, {requestPwd: true});
          const privateKey = await Crypto.decrypt(secret, content)
          resolve({secret, privateKey});
        } else {
          // request new password to encrypt the private key before store it.
          const secret = await promptPasswordElement(container);
          resolve({
            secret,
            privateKey: content
          });
        }
        container.remove();
        ref.style.display = 'block';
        
      } catch (error) {
        reject(error);       
        container.remove();
        ref.style.display = 'block';
      }
    });
  });

  return resutl;

};