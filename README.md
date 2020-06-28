Pre-requesites
install node
install npm

Create a project in Google Actions Console
-> Custom, next
-> Scroll down and select "Click here to build your action using dialogflow"
-> Set display name (Example context demo) (this will be the invocation name for the action)
-> Select "Actions" on the left menu and Get Started
-> Custom Intent (this will open dialogflow)
Without closing the Dialogflow window, open a new terminal window.
Clone the project and cd into it
install Firebase cli
firebase login
npm install --prefix functions/ (if it does not work, cd into functions/ and run npm install)
firebase init
  Select functions, enter
  Select Use an existing project, enter
  Select the project recently created, enter, enter
  Select javascript, enter
  Press N
  Press N (Don't overwrite package.json)
  Press N (Don't overwrite index.js)
  Press N (Don't overwrite .gitignore)
  Press Y (Install dependencies now)
firebase deploy --only functions

get back to the dialogflow page 
create a new agent, choose an agent name and the Google project after the agent is created, the intents page will be opened, we will import the intents already made for this project.
For this, at the left bar, right at the side of  the agent name, select the settings wheel
Export and Import tab
Restore from zip and upload the file dialogflow_backup.zip from the project folder

Head into the Actions Console and test the project in the test tab. It is also possible to test the action in a smartphone, tablet or Google Home with the account of the project setup.

Capabilities: 
