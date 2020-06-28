# Google Action COVID-19 Portugal
This action was made to inform the citizens in a more interactive way about several informations about the Coronavirus (COVID-19) in the country of  Portugal. 

- **Languages available/supported:** 
	- PT-BR;
	- EN;

## Instalation
### Prerequesites  
- [Node.js](https://nodejs.org/) & npm

### Create a new project at [Google Actions Console](https://console.actions.google.com/);
 - Custom, next;
 - Scroll down and select "**Click here to build your action using Dialogflow**";
 - Set display name (Example: Context Project) (This will be the invocation name for the action);
 - Select "**Actions**" on the left menu and Get Started;
 - Select **Custom Intent** (this will open dialogflow);

Without closing the Dialogflow window, open a new terminal window and:

 - Clone  the project from GitHub and cd into it Install [Firebase CLI](https://firebase.google.com/docs/cli);
 - In the terminal window on the root of the cloned project run `firebase login` and login to the Google account used to create the Action Project:
 - `npm install --prefix functions/` (if it does not work, cd into functions/ and run `npm install`);
 - `firebase init`;
	  - Select functions, enter;
	  - Select Use an existing project, enter;
	  - Select the project recently created, enter, enter;
	  - Select javascript, enter;
	  - Press N;
	  - Press N (Don't overwrite package.json);
	  - Press N (Don't overwrite index.js);
	  - Press N (Don't overwrite .gitignore);
	  - Press Y (Install dependencies now);
 - `firebase deploy --only functions`;
  
  Go back to the DialogFlow page.
Create a new agent, choose an **agent name** and **the Google project**.
After the agent is created, the intents page will be opened, we will import the intents already made for this project.  
For this, at the left bar, right at the side of  the agent name, select the settings wheel.
Select **Export and Import** tab.
**Restore from zip** and upload the file **dialogflow_backup.zip** from the project folder  
  
### Testing the action 
**Method  1:** Head into the Actions Console to test the project in the test tab. 
**Method  2:** Test the action in a smartphone, tablet or Google Home with the Google account of the project setup on Assistant.  
  
##  Capabilities
 - How many new cases exist;
 - How many cases exist in my location;
 - Cases in Lisbon;
 - How many deaths exist already;
 - How many tests were made;
 - How many recovered persons exist;
 - How many hospitalized persons;
 - How many suspect cases exist;
 - How many cases wait for laboratory results;
 - Cases in a region: 
	 - North region;
	 - Center region;
	 - Lisbon and Tagus Valley region;
	 - Alentejo's region;
	 - Algarve region;
	 - Azores region;
	 - Madeira region;
- How many cases by sex exist;