import GovernorPostingPanel from '../GovernorPostingPanel';

export default function GovernorPostingPanelExample() {
  return (
    <div className="p-6 max-w-2xl space-y-6">
      <GovernorPostingPanel role="faculty" />
      <GovernorPostingPanel role="department" department="Computer Engineering" />
    </div>
  );
}
