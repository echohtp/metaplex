import { LoadingOutlined } from '@ant-design/icons';
import { loadMetadataForCreator, useConnection, useMeta } from '@oyster/common';
import { Col, Divider, Row, Spin } from 'antd';
import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArtCard } from '../../components/ArtCard';
import { ArtistCard } from '../../components/ArtistCard';
import { MetaplexMasonry } from '../../components/MetaplexMasonry';
import { useCreatorArts } from '../../hooks';

export const ArtistView = () => {
  const { creator } = useParams<{ creator: string }>();
  const { whitelistedCreatorsByCreator, patchState } = useMeta();
  const [loadingArt, setLoadingArt] = useState(true);
  const artwork = useCreatorArts(creator);
  const connection = useConnection();
  const creators = Object.values(whitelistedCreatorsByCreator);

  useEffect(() => {
    if (!creator) {
      return;
    }

    (async () => {
      setLoadingArt(true);
      const active = whitelistedCreatorsByCreator[creator];

      const artistMetadataState = await loadMetadataForCreator(
        connection,
        active,
      );

      patchState(artistMetadataState);
      setLoadingArt(false);
    })();
  }, [connection, creator]);

  return (
    <Row>
      <Col span={24}>
        <h2 className="metaplex-margin-y-4">Creators View</h2>
        <MetaplexMasonry>
          {creators.map((m, idx) => {
            const current = m.info.address;
            return (
              <Link to={`/creators/${current}`} key={idx}>
                <ArtistCard
                  key={current}
                  active={current === creator}
                  artist={{
                    address: current,
                    name: m.info.name || '',
                    image: m.info.image || '',
                    link: m.info.twitter || '',
                  }}
                />
              </Link>
            );
          })}
        </MetaplexMasonry>
      </Col>
      <Col span={24}>
        <Divider />
        {loadingArt ? (
          <div className="app-section--loading">
            <Spin indicator={<LoadingOutlined />} />
          </div>
        ) : (
          <MetaplexMasonry>
            {artwork.map((m, idx) => {
              const id = m.pubkey;
              return (
                <Link to={`/creators/${creator}/nfts/${id}`} key={idx}>
                  <ArtCard key={id} pubkey={m.pubkey} preview={false} />
                </Link>
              );
            })}
          </MetaplexMasonry>
        )}
      </Col>
    </Row>
  );
};
