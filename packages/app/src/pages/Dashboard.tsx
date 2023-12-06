import React from "react";

const Dashboard: React.FC = () => {
  return (
    <div className="artboard w-extension h-extension flex flex-col items-center justify-start bg-gray-800 pt-4">
      {/* Dropdown */}
      <select className="select select-bordered select-xs rounded-full">
        <option selected>Optimism</option>
        <option>Sepolia</option>
      </select>
      {/* Address */}
      <button
        className="btn btn-link"
        onClick={() =>
          navigator.clipboard.writeText("0xYourEthereumAddressHere")
        }
      >
        <div className="badge badge-lg badge-secondary font-lg">
          0xABCDEF....2345
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="1.5"
            stroke="currentColor"
            className="w-3 h-3"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184"
            />
          </svg>
        </div>
      </button>
      {/* Balance */}
      <div className="flex flex-col justify-center items-center my-8 ">
        <h2 className="text-5xl font-bold">5 LINK</h2>
        <h4 className="text-lg">~16$</h4>
      </div>
      {/* Buttons */}
      <div className="flex w-full max-w-sm justify-between my-8">
        <div className="flex flex-col items-center">
          <button className="btn btn-circle btn-outline">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-6 h-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
              />
            </svg>
          </button>
          <p>Add GAS</p>
        </div>
        <div className="flex flex-col items-center">
          <button className="btn btn-circle btn-outline">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-6 h-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18"
              />
            </svg>
          </button>
          <p>Send</p>
        </div>
        <div className="flex flex-col items-center">
          <button className="btn btn-circle btn-outline">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-6 h-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3"
              />
            </svg>
          </button>
          <p>Get LINK</p>
        </div>
      </div>
      {/* Gas Tank */}
      <div className="card w-full max-w-sm bg-gray-100 shadow-xl my-8">
        <div className="card-body">
          <h2 className="card-title text-black">Universal Gas Tank</h2>
          <div className="flex flex-col">
            <p className="text-gray-600 text-sm text-right">$10, ~5 txns</p>
            <progress
              className="progress progress-primary w-full"
              value={42}
              max="100"
            ></progress>
            <div className="flex w-full justify-between my-4">
              <p>🫙</p>
              <p className="text-right">⛽️</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
