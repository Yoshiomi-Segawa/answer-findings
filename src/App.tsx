import React, { FormEvent, ReactSVGElement } from 'react';
import {
  Header,
  HeaderName,
  HeaderPanel,
  SideNav,
  SideNavItems,
  Search,
  Checkbox,
  RadioButtonGroup,
  RadioButton,
  Grid,
  Row,
  Column,
  Tile,
  Tag,
  Button,
  InlineNotification,
  Loading,
  Form,
  FormGroup,
  TextInput,
  ToastNotification,
  TooltipDefinition,
  Tooltip,
  CodeSnippet,
  Slider,
  SliderOnChangeArg,
  Pagination,
  SideNavIcon,
  SideNavItem,
} from 'carbon-components-react';
import { Menu32, CaretLeft32 } from '@carbon/icons-react';
import './App.scss';
import { Query, ListCollections, ListProjects } from './requests';

interface SearchResult {
  answer_text: string;
  confidence: number;
  passage_text: string;
  document_id: string;
}

interface DocumentPassage {
  passage_text: string;
  answers: Array<SearchResult>;
}
interface SearchResultJson {
  document_id: string;
  document_passages: Array<DocumentPassage>;
  result_metadata: {
    collection_id: string;
    confidence: number;
    document_retrieval_source: string;
  };
}

interface CollectionResult {
  name: string;
  collection_id: string;
}

interface ProjectResult {
  project_id: string;
  name: string;
  type: string;
  relevancy_training_status: {};
}

interface AppState {
  searchResults: Array<SearchResult>;
  filteredResults: Array<SearchResult>;
  pageResults: Array<SearchResult>;
  searchResultItemsPerPage: number;
  activePage: number;
  searchString: string;
  searchHistory: Set<string>;
  showPanel: boolean;
  loading: boolean;
  showWarning: boolean;
  warningText: string;
  url: string;
  urlInvalid: boolean;
  apiKey: string;
  apiKeyInvalid: boolean;
  projects: Array<ProjectResult>;
  projectToQuery: string;
  collections: Array<CollectionResult>;
  collectionsToQuery: Set<string>;
  notificationText: string;
  notificationCaption: string;
  apiError: boolean;
  openTooltipID: string;
  sidenavVisible: boolean;
}

class App extends React.Component {
  // Creating a reference
  // box: React.RefObject<HTMLDivElement> = React.createRef();
  state: AppState = {
    searchResultItemsPerPage: 3,
    activePage: 1,
    searchResults: [],
    filteredResults: [],
    pageResults: [],
    searchString: '',
    searchHistory: new Set<string>(),
    showPanel: false,
    loading: false,
    showWarning: false,
    warningText: '',
    apiKey: '',
    apiKeyInvalid: false,
    url: '',
    urlInvalid: false,
    collections: [],
    collectionsToQuery: new Set<string>(),
    projects: [],
    projectToQuery: '',
    notificationText: '',
    notificationCaption: '',
    apiError: false,
    openTooltipID: '',
    sidenavVisible: true,
  };

  /* Handler for Pagination click */
  handlePaginationChange = (data: { page: number; pageSize: number }) => {
    const { filteredResults } = this.state;
    const begin = (data.page - 1) * data.pageSize;
    const end = begin + data.pageSize;
    const pageList = filteredResults.slice(begin, end);
    this.setState({
      activePage: data.page,
      pageResults: pageList,
    });
  };

  /* Handler for Filter/Slider change */
  handleSliderChange = (sliderArg: SliderOnChangeArg) => {
    const { searchResults, searchResultItemsPerPage } = this.state;
    const { value } = sliderArg;

    // display rounded value in input elem
    const sliderInput = document.getElementById(
      'slider-input-for-slider',
    ) as HTMLInputElement;
    sliderInput.value = value.toFixed(2);

    const filteredResults = searchResults.filter(
      (item) => !(item.confidence <= value),
    );

    this.setState({
      filteredResults,
      pageResults: filteredResults.slice(0, searchResultItemsPerPage),
      activePage: 1,
    });
  };

  /* Handler for open tooltip on search result */
  handleOpenTooltips = (
    event: React.FocusEvent<HTMLDivElement>,
    data: { open: boolean },
  ) => {
    if (!event.nativeEvent) {
      this.setState({
        openTooltipID: '',
      });
      return;
    }
    if (event.nativeEvent instanceof MouseEvent) {
      let targetID = event.target.getAttribute('name');
      if (!targetID && !event.target.hasChildNodes()) {
        // implies the target is the <path> html element
        targetID = event.target?.parentElement?.getAttribute('name') || '';
      }
      if (data.open && targetID) {
        // new state is open and another tooltip is already open
        this.setState({
          openTooltipID: targetID,
        });
      } else {
        this.setState({
          openTooltipID: '',
        });
      }
    }
  };

  passSearchConditions = (
    searchString: string,
    apiKey: string,
    url: string,
    collectionsToQuery: Set<string>,
    projectToQuery: string,
  ): Boolean => {
    const apiKeyMissing = apiKey.length < 1;
    const urlMissing = url.length < 1;
    const apiDetailsMissing = apiKeyMissing || urlMissing;
    const noCollectionsChosen = collectionsToQuery.size < 1;
    const noProjectChosen = projectToQuery.length === 0;
    const noSearchString = searchString.length < 1;

    if (apiKeyMissing) {
      this.setState({
        apiKeyInvalid: true,
        notificationText: 'Please fill in API details',
      });
    }

    if (urlMissing) {
      this.setState({
        urlInvalid: true,
        notificationText: 'Please fill in API details',
      });
    }

    if (apiDetailsMissing) {
      return false;
    }

    if (noSearchString) {
      this.setState({
        showWarning: true,
        warningText: 'Please enter a question',
      });
      return false;
    }

    if (noProjectChosen) {
      this.setState({
        showWarning: true,
        warningText: 'Please select at least 1 collection',
      });
      return false;
    }

    if (noCollectionsChosen) {
      this.setState({
        showWarning: true,
        warningText: 'Please select at least 1 collection',
      });
      return false;
    }

    return true;
  };

  /* Handler for Search Query - Form submit */
  onQuery = async (e: FormEvent) => {
    e.preventDefault();

    const {
      searchString,
      apiKey,
      url,
      projectToQuery,
      collectionsToQuery,
      searchResultItemsPerPage,
      searchHistory,
      sidenavVisible,
    } = this.state;

    if (
      this.passSearchConditions(
        searchString,
        apiKey,
        url,
        collectionsToQuery,
        projectToQuery,
      )
    ) {
      try {
        e.preventDefault();
        if (sidenavVisible) {
          this.setState({
            loading: true,
            sidenavVisible: !sidenavVisible,
          });
        } else {
          this.setState({
            loading: true,
          });
        }

        const result: Array<SearchResultJson> = await Query(
          searchString,
          Array.from(collectionsToQuery),
          url,
          projectToQuery,
          apiKey,
        );

        searchHistory.add(searchString);

        const searchResults: Array<SearchResult> = [];
        result.forEach((item) => {
          if (item.document_passages.length > 0) {
            // eslint-disable-next-line @typescript-eslint/naming-convention
            const { document_id } = item;
            item.document_passages.forEach((passage) => {
              // eslint-disable-next-line @typescript-eslint/naming-convention
              let { passage_text } = passage;
              passage_text = passage_text
                .replace(/<(.|\n)*?>/g, '')
                .replace(/[\u{0080}-\u{FFFF}]/gu, '');
              passage.answers.forEach((answer) => {
                // eslint-disable-next-line @typescript-eslint/naming-convention
                const { answer_text, confidence } = answer;
                searchResults.push({
                  answer_text,
                  confidence,
                  passage_text,
                  document_id,
                });
              });
            });
          }
        });

        this.setState({
          showPanel: true,
          searchResults,
          filteredResults: searchResults,
          searchHistory,
          pageResults: searchResults.slice(0, searchResultItemsPerPage),
          apiError: false,
          loading: false,
        });
      } catch (error: unknown | Error) {
        if (error instanceof Error) {
          this.setState({
            notificationText: error.message,
            apiError: true,
            loading: false,
          });
        } else {
          throw new Error('Critical Error -- Contact Team');
        }
      }
    }
  };

  /* Handler for Apply/Submit Api details */
  handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    let performQuery = true;
    const { apiKey, url } = this.state;

    if (apiKey.length < 1) {
      this.setState({
        apiKeyInvalid: true,
      });
      performQuery = false;
    }

    if (url.length < 1) {
      this.setState({
        urlInvalid: true,
      });
      performQuery = false;
    }

    if (performQuery) {
      try {
        this.setState({ loading: true });

        const projects: Array<ProjectResult> = await ListProjects(url, apiKey);

        this.setState({
          loading: false,
          projects,
          apiError: false,
        });
      } catch (error: unknown | Error) {
        if (error instanceof Error) {
          this.setState({
            notificationText: error.message,
            apiError: true,
            loading: false,
          });
        } else {
          throw new Error('Critical Error -- Contact Team');
        }
      }
    }
  };

  /* Handler for sidenav hide/open */
  handleHamburgerClick = (
    e: React.MouseEvent<HTMLElement & ReactSVGElement>,
  ) => {
    this.setState({
      sidenavVisible: true,
    });
  };

  handleHideSidenav = (e: React.MouseEvent<HTMLElement & ReactSVGElement>) => {
    this.setState({
      sidenavVisible: false,
    });
  };

  /* Handler for Select Collection */
  handleClickCheckbox = (
    value: boolean,
    id: string,
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const { collectionsToQuery } = this.state;
    if (value === true && !collectionsToQuery.has(id)) {
      collectionsToQuery.add(id);
    }
    if (value === false && collectionsToQuery.has(id)) {
      collectionsToQuery.delete(id);
    }
    this.setState({
      collectionsToQuery,
    });
  };

  /* Handler for Select Project */
  handleClickRadioButton = async (
    projectToQuery: string,
    name: string,
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const { apiKey, url } = this.state;
    try {
      this.setState({ loading: true });

      const collections: Array<CollectionResult> = await ListCollections(
        url,
        projectToQuery,
        apiKey,
      );

      const collectionsToQuery = new Set(
        collections.map((entry: CollectionResult) => entry.collection_id),
      );

      this.setState({
        projectToQuery,
        loading: false,
        collections,
        collectionsToQuery,
        apiError: false,
      });
    } catch (error: unknown | Error) {
      if (error instanceof Error) {
        this.setState({
          notificationText: error.message,
          apiError: true,
          loading: false,
        });
      } else {
        throw new Error('Critical Error -- Contact Team');
      }
    }
  };

  /* Handler for Search String change event */
  onSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    this.setState({
      searchString: e.target.value,
      showWarning: false,
      warningText: '',
    });
  };

  /* Handler for New Search button press */
  onNewSearch = () => {
    this.setState({
      showPanel: false,
      searchString: '',
    });
    // clear the search input field
    const searchInputField = document.getElementById(
      'searchInput',
    ) as HTMLInputElement;
    searchInputField.value = '';
  };

  /* Handler for click previous search */
  handlePreviousSearchClick = (e: React.MouseEvent<HTMLElement>) => {
    const target = e.target as HTMLElement;
    const submitButton = document.getElementById(
      'formSubmitButton',
    ) as HTMLButtonElement;

    this.setState(
      {
        searchString: target.innerText,
      },
      () => {
        submitButton.click();
      },
    );
  };

  render() {
    const {
      filteredResults,
      showPanel,
      loading,
      searchString,
      searchHistory,
      showWarning,
      warningText,
      urlInvalid,
      apiKeyInvalid,
      collections,
      notificationText,
      notificationCaption,
      apiError,
      openTooltipID,
      pageResults,
      searchResultItemsPerPage,
      activePage,
      sidenavVisible,
      url,
      collectionsToQuery,
      projects,
      projectToQuery,
      apiKey,
    } = this.state;

    // generates Cards
    const cardContent = (item: SearchResult, key: number) => {
      let open = false;

      if (`data_trigger_${key}` === openTooltipID) {
        open = true;
      }

      return (
        <div className="card" key={key}>
          <Tile className="cardContent">
            <h5>{item.answer_text}</h5>
            <Tooltip
              direction="left"
              tabIndex={0}
              triggerText="more info"
              onChange={this.handleOpenTooltips}
              menuOffset={{ left: 566, top: 55 }}
              triggerId={`data_trigger_${key}`}
              iconName={`data_trigger_${key}`}
              focusTrap={false}
              open={open}
            >
              <p>Document ID:</p>
              <CodeSnippet
                type="inline"
                feedback="Copied to clipboard"
                className="codeSnippet"
              >
                {item.document_id}
              </CodeSnippet>
              <p>{item.passage_text}</p>
              <div className="bx--tooltip__footer">
                <p> </p>
              </div>
            </Tooltip>
          </Tile>
          <div className="cardFooter">
            <p>
              Confidence Score: <span>{item.confidence.toFixed(4)}</span>
            </p>
          </div>
        </div>
      );
    };

    // loading on query
    let loadingDiv = <div id="loading" />;
    if (loading) {
      loadingDiv = (
        <Loading
          id="loading"
          description="Contacting service..."
          withOverlay={true}
        />
      );
    }

    // if projects exists
    const generateProjectCheckbox = (project: ProjectResult) => (
      <RadioButton
        labelText={project.name}
        id={project.project_id}
        value={project.project_id}
        key={project.project_id}
      />
    );

    let projectsDiv = <p>no existing projects found</p>;
    if (projects.length > 0) {
      projectsDiv = (
        <RadioButtonGroup
          legendText=""
          orientation="vertical"
          name="radio-button-group"
          className="project-checkbox-wrapper"
          onChange={this.handleClickRadioButton}
          valueSelected={projectToQuery}
        >
          {projects.map((item) => generateProjectCheckbox(item))}
        </RadioButtonGroup>
      );
    }

    // if collections exists
    const generateCheckbox = (collection: CollectionResult) => (
      <Checkbox
        checked={
          collectionsToQuery.has(collection.collection_id) ? true : false
        }
        labelText={collection.name}
        id={collection.collection_id}
        key={collection.collection_id}
        onChange={this.handleClickCheckbox}
      />
    );

    let collectionsDiv = <p>no collections found</p>;
    if (collections.length > 0) {
      collectionsDiv = (
        <div>{collections.map((item) => generateCheckbox(item))}</div>
      );
    }

    // Empty Query warning
    let warningDiv = <div id="warning" />;
    if (showWarning) {
      warningDiv = (
        <InlineNotification
          id="warning"
          kind="warning"
          title={warningText}
          onCloseButtonClick={() =>
            this.setState({ showWarning: false, warningText: '' })
          }
        />
      );
    }

    // Api warnings
    let notification = <div id="notification" />;
    if (apiKeyInvalid || urlInvalid || apiKeyInvalid || apiError) {
      notification = (
        <ToastNotification
          id="apiNotification"
          caption={notificationCaption}
          iconDescription="describes the close button"
          subtitle={<span>{notificationText}</span>}
          title="Failed!"
          kind="error"
        />
      );
    }

    return (
      <div className="app-centered-content">
        {loadingDiv}
        {notification}
        <Header aria-label="IBM Platform Name">
          <HeaderName href="#" prefix="IBM Discovery">
            [Reading Comprehension]
          </HeaderName>
          <HeaderPanel aria-label="Header Panel" expanded={showPanel}>
            <Grid>
              <Row>
                <Column sm={4} md={4} lg={4}>
                  <div id="sliderContainer">
                    <Slider
                      id="slider"
                      step={0.05}
                      max={1}
                      min={0}
                      labelText="Filter"
                      value={0}
                      onChange={this.handleSliderChange}
                    />
                  </div>
                  <Button
                    type="button"
                    kind="ghost"
                    className="newSearchButton"
                    onClick={this.onNewSearch}
                  >
                    New Query
                  </Button>
                </Column>
                <Column sm={8} md={8} lg={8} className="resultContainer">
                  <h4 className="searchString">{searchString}</h4>
                  {filteredResults.length > 0 ? (
                    <div>
                      <div className="cardWrapper">
                        {pageResults.map((item, index: number) =>
                          cardContent(item, index),
                        )}
                      </div>
                      <Pagination
                        totalItems={filteredResults.length}
                        page={activePage}
                        pageSize={searchResultItemsPerPage}
                        pageSizes={[searchResultItemsPerPage]}
                        onChange={this.handlePaginationChange}
                      />
                    </div>
                  ) : (
                    <p id="noResultsText">no results for this query</p>
                  )}
                </Column>
              </Row>
            </Grid>
          </HeaderPanel>
        </Header>
        <Row className="main-content-row">
          <Column sm={12} md={12} lg={12}>
            <div id="searchContainer">
              <h1>Ask a question: </h1>
              <div>
                <Form
                  onSubmit={(e: FormEvent) => this.onQuery(e)}
                  id="searchForm"
                >
                  <Search
                    labelText="Ask a question"
                    size="xl"
                    id="searchInput"
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      this.onSearchChange(e)
                    }
                  />
                  <Button
                    className="searchSubmit"
                    type="submit"
                    size="sm"
                    kind="ghost"
                    id="formSubmitButton"
                  >
                    Query
                  </Button>
                </Form>
                {warningDiv}
              </div>
            </div>
          </Column>
        </Row>
        <Row>
          <Column sm={12} md={12} lg={12}>
            <div id="previousSearches">
              {Array.from(searchHistory).map((previousSearch) => (
                <Tag
                  onClick={(e) => this.handlePreviousSearchClick(e)}
                  key={previousSearch.toLowerCase().replace(' ', '')}
                  filter={false}
                  type="magenta"
                >
                  {previousSearch}
                </Tag>
              ))}
            </div>
          </Column>
        </Row>
        {sidenavVisible ? (
          <SideNav
            isFixedNav
            isRail
            expanded={true}
            isChildOfHeader={true}
            aria-label="Side navigation"
            id="side-nav"
          >
            <SideNavIcon>
              <CaretLeft32 onClick={this.handleHideSidenav} />
            </SideNavIcon>
            <Form className="apiCredentialsForm" onSubmit={this.handleSubmit}>
              <FormGroup legendText="API CREDENTIALS">
                <TextInput
                  id="url"
                  labelText="URL"
                  type="url"
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                    this.setState({
                      url: event.target.value,
                      urlInvalid: false,
                    })
                  }
                  invalid={urlInvalid}
                  value={url}
                />
                <TextInput
                  id="api-key"
                  type="password"
                  labelText="API Key"
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                    this.setState({
                      apiKey: event.target.value,
                      apiKeyInvalid: false,
                    })
                  }
                  invalid={apiKeyInvalid}
                  value={apiKey}
                />
                <Button
                  type="submit"
                  kind="ghost"
                  size="sm"
                  className="formSubmitButton"
                >
                  Apply
                </Button>
              </FormGroup>
            </Form>
            <SideNavItems>
              <SideNavItem>
                <TooltipDefinition
                  tooltipText="Select project to query"
                  direction="bottom"
                  tabIndex={0}
                  align="center"
                >
                  <p>PROJECTS</p>
                </TooltipDefinition>
                {projectsDiv}
              </SideNavItem>
              <SideNavItem className="collections-wrapper">
                <TooltipDefinition
                  tooltipText="Choose Collection(s)"
                  direction="bottom"
                  tabIndex={0}
                  align="center"
                >
                  <p>COLLECTIONS</p>
                </TooltipDefinition>
                {collectionsDiv}
              </SideNavItem>
            </SideNavItems>
          </SideNav>
        ) : (
          <Menu32 id="hamburger" onClick={this.handleHamburgerClick} />
        )}
      </div>
    );
  }
}

export default App;
