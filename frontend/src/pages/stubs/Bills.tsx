// These are placeholder pages — implement each as a full feature.
// Each follows the same pattern:
//   1. useEffect → fetch data from store
//   2. Render list with add/edit/delete UI
//   3. Use Zustand store actions for mutations

export default function Bills() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Bills</h1>
      <p className="text-gray-500">
        TODO: Fetch from <code className="bg-gray-100 px-1 rounded">useBillsStore</code>.
        Show list sorted by priority score. Allow adding, marking paid, deleting.
      </p>
    </div>
  );
}
