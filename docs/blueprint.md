# **App Name**: ANAN Health

## Core Features:

- LINE Login: Authenticate users via LINE's LIFF SDK and store their profile data.
- Profile Display: Display the user's LINE profile (avatar, display name) on the home screen to welcome them.
- Premium Calculation Preview: Call the server-side calculatePremium stub function to generate a premium summary based on user inputs. The stub incorporates a tool which decides when or if a note needs to be added to the summary output.
- Graph Visualization: Generate a chart visualizing the premium breakdown over the coverage period based on mocked series data.
- Table Display: Present the yearly premium breakdown in a tabular format with columns for Year, Base, Riders, Total, and Note.
- Session Persistence: Save user input and calculation results in a temporary session object, persisting this session data for users to retrieve and update in later sessions.
- Data Export: Enable exporting the premium table data as a CSV file.

## Style Guidelines:

- Primary color: Muted teal (#00BD8E), reminiscent of a clear sky and symbolizing security and trust.
- Background color: Light, desaturated blue (#F0F8FF) creates a clean, calming backdrop.
- Body and headline font: 'PT Sans', a humanist sans-serif that is modern, yet approachable and easy to read.
- Use clear and concise icons from Headless UI to represent different insurance concepts and features. The style will have clean, rounded corners.
- Employ a stepper UI for the calculator flow to guide users through the steps. Use clear route guards so that a user must fill out all required fields.
- Subtle animations, like a gentle fade-in effect when switching between calculator steps, enhance the user experience without being distracting.