import React, { Component } from 'react';
import gql from 'graphql-tag';
import { Query } from 'react-apollo';
import styled from 'styled-components';
import Head from 'next/head';

import Error from './ErrorMessage';

const SINGLE_ITEM_QUERY = gql`
  query SINGLE_ITEM_QUERY($id: ID!) {
    item(where: { id: $id }) {
      id
      title
      description
      largeImage
    }
  }
`;

const StyledSingleItems = styled.div`
  max-width: 1500px;
  margin: 2rem auto;
  box-shadow: ${props => props.theme.bs};
  display: grid;
  grid-auto-columns: 1fr;
  grid-auto-flow: column;
  min-height: 800px;
  img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
  .details {
    margin: 3rem;
    font-size: 2rem;
  }
`;

class SingleItem extends Component {
  render() {
    return (
      <Query
        query={SINGLE_ITEM_QUERY}
        variables={{
          id: this.props.id,
        }}
      >
        {({ error, loading, data }) => {
          if (error) return <Error error={error} />;
          if (loading) return <p>Loading...</p>;
          if (!data.item) return <p>No item found for {this.props.id}</p>
          const { largeImage, title, description } = data.item;
          return (
            <StyledSingleItems>
              <Head><title>Sick Fits {title && `| ${title}`}</title></Head>
              <img src={largeImage} alt={title} />
              <div className="details">
                <h2>{title}</h2>
                <p>{description}</p>
              </div>
            </StyledSingleItems>
          );
        }}
      </Query>
    );
  }
}

export default SingleItem;