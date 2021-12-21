const Query = async (
  payload: string,
  collectionIDs: Array<string>,
  url: string,
  projectID: string,
  apiKey: string,
) => {
  const requestBody = {
    collection_ids: collectionIDs,
    natural_language_query: payload,
    count: 15,
    return: ['document_id'],
    table_results: { enabled: false },
    passages: {
      enabled: true,
      find_answers: true,
      per_document: true,
      count: 1,
    },
  };

  const requestOptions = {
    method: 'POST',
    RequestsMode: 'no-cors',
    headers: {
      'Content-Type': 'application/json',
      Accept: '*/*',
      Authorization: `Basic ${btoa(`apikey:${apiKey}`)}`,
    },
    body: JSON.stringify(requestBody),
  };

  const endpoint = `${url}/v2/projects/${projectID}/query?version=2019-11-22`;

  const requestResponse = await fetch(endpoint, requestOptions);
  if (requestResponse.ok) {
    const responseBody = await requestResponse.json();
    return responseBody.results;
  }
  throw new Error(
    `${requestResponse.status.toString()}: ${requestResponse.statusText}`,
  );
};

const ListProjects = async (url: string, apiKey: string) => {
  const requestOptions = {
    method: 'GET',
    RequestsMode: 'no-cors',
    headers: {
      'Content-Type': 'application/json',
      Accept: '*/*',
      Authorization: `Basic ${btoa(`apikey:${apiKey}`)}`,
      'Accept-Encoding': 'gzip, deflate, br',
      Connection: 'keep-alive',
    },
  };

  const endpoint = `${url}/v2/projects?version=2019-11-22`;
  const requestResponse = await fetch(endpoint, requestOptions);
  if (requestResponse.ok) {
    // console.log(requestResponse);
    const responseBody = await requestResponse.json();
    return responseBody.projects;
  }
  throw new Error(
    `${requestResponse.status.toString()}: ${requestResponse.statusText}`,
  );
};

const ListCollections = async (
  url: string,
  projectID: string,
  apiKey: string,
) => {
  const requestOptions = {
    method: 'GET',
    RequestsMode: 'no-cors',
    headers: {
      'Content-Type': 'application/json',
      Accept: '*/*',
      Authorization: `Basic ${btoa(`apikey:${apiKey}`)}`,
      'Accept-Encoding': 'gzip, deflate, br',
      Connection: 'keep-alive',
    },
  };
  const endpoint = `${url}/v2/projects/${projectID}/collections?version=2019-11-22`;
  const requestResponse = await fetch(endpoint, requestOptions);
  if (requestResponse.ok) {
    // console.log(requestResponse);
    const responseBody = await requestResponse.json();
    return responseBody.collections;
  }
  throw new Error(
    `${requestResponse.status.toString()}: ${requestResponse.statusText}`,
  );
};

export { Query, ListCollections, ListProjects };
