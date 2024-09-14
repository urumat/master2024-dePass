// NFTs.jsx
import React from 'react';

const NFTs = ({ nfts }) => {
  return (
    <>
      {nfts ? (
        <>
          {nfts.map((e, i) => (
            e && (
              <img
                key={i}
                className="nftImage"
                alt="nftImage"
                src={e}
              />
            )
          ))}
        </>
      ) : (
        <>
          <span>You seem to not have any NFTs yet</span>
        </>
      )}
    </>
  );
};

export default NFTs;