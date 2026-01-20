// This is a quick reference for the UI help text that should be added to the requirements page
// You can use this to update the page with helpful tooltips or information

const SUBMISSION_HELP = {
  pdf: {
    title: "📄 Upload PDF File",
    description: "Select a PDF file from your computer",
    benefits: [
      "✅ Instant secure storage on our servers",
      "✅ Fast upload (works best for files under 20MB)",
      "✅ Perfect for standard PDF resumes"
    ],
    tips: "For mobile: Keep files under 5MB for fastest upload",
    formats: "PDF only (.pdf)"
  },
  googleDrive: {
    title: "🔗 Google Drive Link",
    description: "Share a link to your Google Drive file or folder",
    benefits: [
      "✅ No file upload needed - instant submission",
      "✅ Easy to update your document anytime",
      "✅ Supports: Files, Folders, Docs, Sheets, Slides"
    ],
    tips: "Make sure to set sharing to 'Anyone with link can view'",
    formats: "Google Drive file/folder or Google Docs/Sheets/Slides"
  },
  generalTips: [
    "You can only apply once per job position",
    "Both methods are equally acceptable",
    "HR can view both PDF and Google Drive submissions easily",
    "You can edit your application while it's 'Under Review'"
  ]
};

export default SUBMISSION_HELP;
