
window.addEventListener("load", () => {
  // Only run on staging/development environments
  const isStaging = ["webflow.io", "staging", "dev", "test"].some((env) =>
    window.location.hostname.includes(env)
  );

  if (!isStaging) {
    console.log("Accessibility checker disabled on production");
    return;
  }

  // Create toggle button with modern design
  const toggleButton = document.createElement("button");
  toggleButton.id = "flowki";
  toggleButton.innerHTML = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M2 12a5 5 0 0 0 5 5 8 8 0 0 1 5 2 8 8 0 0 1 5-2 5 5 0 0 0 5-5V7H2Z"></path>
      <path d="M6 11V8h12v3"></path>
    </svg>
    <span>Flowki</span>
  `;
  toggleButton.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: #1a1a2e;
    color: white;
    border: none;
    border-radius: 8px;
    padding: 12px 16px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    z-index: 9998;
    box-shadow: 0 4px 20px rgba(0,0,0,0.2);
    display: flex;
    align-items: center;
    gap: 8px;
    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    font-family: -apple-system, BlinkMacSystemFont, sans-serif;
  `;
  document.body.appendChild(toggleButton);

  // Add hover effects
  toggleButton.addEventListener("mouseover", () => {
    toggleButton.style.transform = "translateY(-2px)";
    toggleButton.style.boxShadow = "0 6px 25px rgba(0,0,0,0.3)";
  });

  toggleButton.addEventListener("mouseout", () => {
    toggleButton.style.transform = "translateY(0)";
    toggleButton.style.boxShadow = "0 4px 20px rgba(0,0,0,0.2)";
  });

  // Store all overlays to be able to remove them later
  let imageOverlays = [];

  // Clean up all overlays and highlights
  function cleanupHighlights() {
    // Remove image overlays
    imageOverlays.forEach((overlay) => {
      if (overlay && overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }
    });
    imageOverlays = [];

    // Reset element styles
    document.querySelectorAll("[data-accessibility-id]").forEach((el) => {
      el.style.outline = "";
      el.style.backgroundColor = "";
    });
  }

  // Check accessibility and SEO issues
  function checkAccessibilityAndSEO() {
    // Clean up any existing highlights first
    cleanupHighlights();

    const results = {
      interactive: { valid: [], invalid: [] }, // Combined links and buttons
      images: { valid: [], invalid: [] },
      headings: { valid: [], invalid: [] },
      meta: { valid: [], invalid: [] },
    };

    // Style constants
    const styles = {
      valid: `outline: 2px solid #22c55e !important;`,
      invalid: `outline: 2px solid #ef4444 !important;`,
    };

    // Special handling for Webflow elements
    function isWebflowHiddenElement(el) {
      // Check for Webflow's hidden tab content and other hidden interactive elements
      if (
        el.classList.contains("w--tab-active") ||
        el.getAttribute("aria-hidden") === "true" ||
        el.style.display === "none" ||
        getComputedStyle(el).display === "none"
      ) {
        return true;
      }
      return false;
    }

    // Detect Webflow tab links
    function isWebflowTabLink(link) {
      return (
        link.classList.contains("w-tab-link") ||
        link.hasAttribute("data-w-tab") ||
        link.closest(".w-tab-menu") !== null
      );
    }

    // Check links including Webflow-specific ones
    document.querySelectorAll("a").forEach((link, index) => {
      if (link.classList.contains("w-webflow-badge")) return;

      const href = link.getAttribute("href");
      link.dataset.accessibilityId = `interactive-${index}`;

      // Special handling for Webflow tab links
      const isTabLink = isWebflowTabLink(link);
      const isHidden = isWebflowHiddenElement(link);

      if ((!href || href.trim() === "" || href === "#") && !isTabLink) {
        link.style.cssText += styles.invalid;
        results.interactive.invalid.push({
          element: link,
          issue: "Missing or empty href attribute",
          id: link.dataset.accessibilityId,
          type: "link",
          isHidden: isHidden,
        });
      } else {
        link.style.cssText += styles.valid;
        results.interactive.valid.push({
          element: link,
          id: link.dataset.accessibilityId,
          type: "link",
          isHidden: isHidden,
        });
      }
    });

    // Check buttons
    document
      .querySelectorAll("button, .w-button, [role='button']")
      .forEach((btn, index) => {
        if (btn.id === "flowki" || btn.closest("#flowki-panel")) return;

        const hasOnClick = btn.hasAttribute("onclick");
        const hasFormAction = btn.hasAttribute("formaction");
        const hasEventListeners = btn.getAttribute("data-w-id") !== null;
        const onclickValue = btn.getAttribute("onclick") || "";
        const hasHrefInJS =
          onclickValue.includes("location.href") ||
          onclickValue.includes("window.location");
        const isHidden = isWebflowHiddenElement(btn);

        btn.dataset.accessibilityId = `interactive-btn-${index}`;

        if (hasOnClick || hasFormAction || hasHrefInJS || hasEventListeners) {
          btn.style.cssText += styles.valid;
          results.interactive.valid.push({
            element: btn,
            id: btn.dataset.accessibilityId,
            type: "button",
            isHidden: isHidden,
          });
        } else {
          btn.style.cssText += styles.invalid;
          results.interactive.invalid.push({
            element: btn,
            issue: "Missing interactive behavior",
            id: btn.dataset.accessibilityId,
            type: "button",
            isHidden: isHidden,
          });
        }
      });

    // Check images
    document.querySelectorAll("img").forEach((img, index) => {
      const hasAlt = img.hasAttribute("alt");
      const altText = img.getAttribute("alt") || "";
      const src = img.getAttribute("src") || "";
      img.dataset.accessibilityId = `image-${index}`;
      const isHidden = isWebflowHiddenElement(img);

      // Check for issues
      const issues = [];

      if (!hasAlt || altText.trim() === "") {
        issues.push("Missing alt text");
      }

      // Check image format
      const fileExtension = src.split(".").pop().toLowerCase();
      if (
        fileExtension &&
        ["jpg", "jpeg", "png", "gif", "webp"].includes(fileExtension)
      ) {
        if (fileExtension === "png" && img.width > 300) {
          issues.push("PNG used for large image");
        } else if (
          ["jpg", "jpeg"].includes(fileExtension) &&
          img.width <= 100
        ) {
          issues.push("JPG used for small image");
        } else if (fileExtension === "gif" && !src.includes("animated")) {
          issues.push("GIF used for static image");
        }
      }

      if (issues.length > 0) {
        img.style.cssText += styles.invalid;

        // Only create overlay if the image is properly positioned and visible
        if (img.offsetWidth > 0 && img.offsetHeight > 0 && !isHidden) {
          // Get the computed position style of the image
          const imgPosition = window.getComputedStyle(img).position;
          const imgParentPosition = window.getComputedStyle(
            img.parentNode
          ).position;

          // Create overlay with issue text
          const overlay = document.createElement("div");
          overlay.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: ${img.offsetWidth}px;
            height: ${img.offsetHeight}px;
            background-color: rgba(239, 68, 68, 0.7);
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            text-align: center;
            font-size: 14px;
            font-weight: bold;
            pointer-events: none;
            z-index: 9997;
            padding: 10px;
            font-family: -apple-system, BlinkMacSystemFont, sans-serif;
          `;
          overlay.textContent = issues.join(", ");

          // Position relative to parent if needed
          if (imgPosition === "static") {
            if (imgParentPosition === "static") {
              const wrapper = document.createElement("div");
              wrapper.style.cssText = `
                position: relative;
                display: inline-block;
                width: ${img.offsetWidth}px;
                height: ${img.offsetHeight}px;
              `;
              img.parentNode.insertBefore(wrapper, img);
              wrapper.appendChild(img);
              wrapper.appendChild(overlay);
            } else {
              img.style.position = "relative";
              img.parentNode.appendChild(overlay);
            }
          } else {
            img.parentNode.appendChild(overlay);
          }

          // Store the overlay for later cleanup
          imageOverlays.push(overlay);
        }

        results.images.invalid.push({
          element: img,
          issue: issues.join(", "),
          id: img.dataset.accessibilityId,
          isHidden: isHidden,
        });
      } else {
        img.style.cssText += styles.valid;
        results.images.valid.push({
          element: img,
          id: img.dataset.accessibilityId,
          isHidden: isHidden,
        });
      }
    });

    // Check headings
    const headings = [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")];
    let lastLevel = 0;
    let hasH1 = false;

    headings.forEach((h, i) => {
      const level = parseInt(h.tagName[1]);
      h.dataset.accessibilityId = `heading-${i}`;
      const isHidden = isWebflowHiddenElement(h);

      if (level === 1) {
        if (hasH1) {
          h.style.cssText += styles.invalid;
          results.headings.invalid.push({
            element: h,
            issue: "Multiple <h1> tags found",
            id: h.dataset.accessibilityId,
            isHidden: isHidden,
          });
        } else {
          hasH1 = true;
          h.style.cssText += styles.valid;
        }
      } else if (level > lastLevel + 1) {
        h.style.cssText += styles.invalid;
        results.headings.invalid.push({
          element: h,
          issue: `Heading level skipped from <h${lastLevel}> to <h${level}>`,
          id: h.dataset.accessibilityId,
          isHidden: isHidden,
        });
      } else {
        h.style.cssText += styles.valid;
      }
      lastLevel = level;
    });

    if (!hasH1) {
      results.headings.invalid.push({
        issue: "No <h1> tag found",
        element: document.body,
        id: "heading-missing-h1",
        isHidden: false,
      });
    }

    return results;
  }

  // Highlight element when clicked in results panel
  function flashElement(element) {
    // First check if element exists and is visible
    if (!element || !element.getBoundingClientRect) {
      console.error("Cannot find element to highlight");
      return;
    }

    // Check if element is in a hidden tab (Webflow tabs)
    if (element.closest('[aria-hidden="true"]')) {
      // Try to find and activate the related tab
      const tabId = element.closest("[data-w-tab]")?.getAttribute("data-w-tab");
      if (tabId) {
        const tabLink = document.querySelector(`[data-w-tab="${tabId}"]`);
        if (tabLink && typeof tabLink.click === "function") {
          tabLink.click();
          // Wait for tab to activate before scrolling
          setTimeout(() => {
            scrollAndHighlight(element);
          }, 300);
          return;
        }
      }
    }

    scrollAndHighlight(element);
  }

  function scrollAndHighlight(element) {
    // Handle special cases like tabs and accordions
    if (getComputedStyle(element).display === "none") {
      // Try to find a parent that might be a tab or accordion
      let parent = element.parentElement;
      while (parent && parent !== document.body) {
        if (
          parent.classList.contains("w-tab-pane") ||
          parent.classList.contains("w-dropdown-list") ||
          parent.classList.contains("w-accordion-content")
        ) {
          // Try to find and click the toggle
          const id = parent.id;
          if (id) {
            const control = document.querySelector(`[aria-controls="${id}"]`);
            if (control) {
              control.click();
              // Wait for animation before scrolling
              setTimeout(() => {
                element.scrollIntoView({ behavior: "smooth", block: "center" });
                highlightElement(element);
              }, 300);
              return;
            }
          }
        }
        parent = parent.parentElement;
      }
    }

    // Default behavior for visible elements
    element.scrollIntoView({ behavior: "smooth", block: "center" });
    highlightElement(element);
  }

  function highlightElement(element) {
    const originalOutline = element.style.outline;
    const originalBg = element.style.backgroundColor;

    element.style.outline = "3px solid #f59e0b";
    element.style.backgroundColor = "rgba(245, 158, 11, 0.2)";

    setTimeout(() => {
      element.style.outline = originalOutline;
      element.style.backgroundColor = originalBg;
    }, 2000);
  }

  // Create results panel with modern UI
  function createResultsPanel(results) {
    // Remove existing panel if present
    const existingPanel = document.getElementById("flowki-panel");
    if (existingPanel) existingPanel.remove();

    // Create panel container
    const container = document.createElement("div");
    container.id = "flowki-panel";
    container.setAttribute("data-lenis-prevent", "");
    container.style.cssText = `
      position: fixed;
      bottom: 0;
      left: 0;
      width: 100%;
      background-color: #0f172a;
      color: white;
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: 14px;
      z-index: 9999;
      box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.3);
      max-height: 60vh;
      overflow-y: auto;
      display: none;
      border-top: 3px solid #3b82f6;
    `;

    // Create header
    const header = document.createElement("div");
    header.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 20px;
      background-color: #1e293b;
      position: sticky;
      top: 0;
      z-index: 1;
    `;

    const title = document.createElement("h3");
    title.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 8px;">
        <path d="M2 12a5 5 0 0 0 5 5 8 8 0 0 1 5 2 8 8 0 0 1 5-2 5 5 0 0 0 5-5V7H2Z"></path>
        <path d="M6 11V8h12v3"></path>
      </svg>
      <span>Flowki the Accessibility & SEO Checker</span>
    `;
    title.style.cssText = `
      margin: 0;
      color: white;
      font-size: 18px;
      font-weight: 600;
      display: flex;
      align-items: center;
    `;

    const buttonContainer = document.createElement("div");
    buttonContainer.style.cssText = `display: flex; gap: 12px; align-items: center;`;

    // Add persistent mode toggle
    const persistentToggle = document.createElement("label");
    persistentToggle.style.cssText = `
      display: flex;
      align-items: center;
      cursor: pointer;
      user-select: none;
      gap: 8px;
      font-size: 14px;
      margin-right: 8px;
    `;

    const persistentCheckbox = document.createElement("input");
    persistentCheckbox.type = "checkbox";
    persistentCheckbox.style.cssText = `
      height: 0;
      width: 0;
      visibility: hidden;
      position: absolute;
    `;

    const persistentSwitch = document.createElement("span");
    persistentSwitch.style.cssText = `
      position: relative;
      display: block;
      width: 32px;
      height: 16px;
      background: #334155;
      border-radius: 100px;
      transition: 0.2s;
    `;

    const persistentCircle = document.createElement("span");
    persistentCircle.style.cssText = `
      position: absolute;
      top: 1px;
      left: 1px;
      width: 14px;
      height: 14px;
      border-radius: 14px;
      transition: 0.2s;
      background: white;
    `;
    persistentSwitch.appendChild(persistentCircle);

    persistentToggle.appendChild(persistentCheckbox);
    persistentToggle.appendChild(persistentSwitch);
    persistentToggle.appendChild(document.createTextNode("Keep highlights"));

    // Store persistent mode state (access global variable)

    persistentCheckbox.addEventListener("change", function () {
      isPersistentMode = this.checked;
      if (isPersistentMode) {
        persistentCircle.style.left = "calc(100% - 15px)";
        persistentSwitch.style.background = "#22c55e";
      } else {
        persistentCircle.style.left = "1px";
        persistentSwitch.style.background = "#334155";
      }
    });

    // Add a refresh button
    const refreshButton = document.createElement("button");
    refreshButton.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
        <path d="M3 3v5h5"></path>
      </svg>
    `;
    refreshButton.title = "Refresh analysis";
    refreshButton.style.cssText = `
      background: none;
      border: none;
      color: white;
      cursor: pointer;
      padding: 4px;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background-color 0.2s;
    `;
    refreshButton.addEventListener("click", () => {
      const newResults = checkAccessibilityAndSEO();
      document.body.removeChild(container);
      const newPanel = createResultsPanel(newResults);
      newPanel.style.display = "block";
      // Preserve persistent mode state
      const newPersistentCheckbox = newPanel.querySelector(
        'input[type="checkbox"]'
      );
      if (newPersistentCheckbox && isPersistentMode) {
        newPersistentCheckbox.checked = true;
        newPersistentCheckbox.dispatchEvent(new Event("change"));
      }
    });
    refreshButton.addEventListener("mouseover", () => {
      refreshButton.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
    });
    refreshButton.addEventListener("mouseout", () => {
      refreshButton.style.backgroundColor = "transparent";
    });

    // Add close button
    const closeButton = document.createElement("button");
    closeButton.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    `;
    closeButton.style.cssText = `
      background: none;
      border: none;
      color: white;
      cursor: pointer;
      padding: 4px;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background-color 0.2s;
    `;
    closeButton.addEventListener("click", () => {
      container.style.display = "none";
      // Only cleanup highlights if not in persistent mode
      if (!isPersistentMode) {
        cleanupHighlights();
      }
    });
    closeButton.addEventListener("mouseover", () => {
      closeButton.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
    });
    closeButton.addEventListener("mouseout", () => {
      closeButton.style.backgroundColor = "transparent";
    });

    buttonContainer.appendChild(persistentToggle);
    buttonContainer.appendChild(refreshButton);
    buttonContainer.appendChild(closeButton);
    header.appendChild(title);
    header.appendChild(buttonContainer);
    container.appendChild(header);

    // Create content wrapper
    const content = document.createElement("div");
    content.style.cssText = `padding: 0 20px 20px;`;
    container.appendChild(content);

    // Create stats summary
    const summary = document.createElement("div");
    summary.style.cssText = `
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 16px;
      margin: 20px 0;
    `;

    const categories = [
      {
        name: "Interactive",
        icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>',
        valid: results.interactive.valid,
        invalid: results.interactive.invalid,
        detail: `${
          results.interactive.valid.filter((i) => i.type === "link").length
        } links, ${
          results.interactive.valid.filter((i) => i.type === "button").length
        } buttons`,
      },
      {
        name: "Images",
        icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>',
        valid: results.images.valid,
        invalid: results.images.invalid,
      },
      {
        name: "Headings",
        icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 12h12"></path><path d="M6 20V4"></path><path d="M18 20V4"></path></svg>',
        valid: results.headings.valid,
        invalid: results.headings.invalid,
      },
    ];

    categories.forEach((cat) => {
      const box = document.createElement("div");
      box.style.cssText = `
        background-color: #1e293b;
        padding: 16px;
        border-radius: 8px;
        transition: transform 0.2s, box-shadow 0.2s;
        border: 1px solid #334155;
      `;

      const totalItems = cat.valid.length + cat.invalid.length;
      const passRate =
        totalItems > 0
          ? Math.round((cat.valid.length / totalItems) * 100)
          : 100;
      const statusColor =
        passRate >= 90 ? "#22c55e" : passRate >= 70 ? "#f59e0b" : "#ef4444";

      box.innerHTML = `
        <div style="display: flex; align-items: center; margin-bottom: 12px;">
          <span style="margin-right: 8px; opacity: 0.8;">${cat.icon}</span>
          <span style="font-weight: 600;">${cat.name}</span>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <div style="color: #22c55e; display: flex; align-items: center; gap: 4px;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 6 9 17l-5-5"></path>
              </svg>
              ${cat.valid.length}
            </div>
            <div style="color: #ef4444; display: flex; align-items: center; gap: 4px; margin-top: 4px;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 6 6 18"></path><path d="m6 6 12 12"></path>
              </svg>
              ${cat.invalid.length}
            </div>
            ${
              cat.detail
                ? `<div style="font-size: 12px; color: #94a3b8; margin-top: 6px;">${cat.detail}</div>`
                : ""
            }
          </div>
          <div style="width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background-color: rgba(255,255,255,0.05); position: relative;">
            <div style="position: absolute; width: 36px; height: 36px; border-radius: 50%; border: 3px solid ${statusColor}; transform: rotate(-90deg);"></div>
            <span style="font-weight: bold; font-size: 12px;">${passRate}%</span>
          </div>
        </div>
      `;

      box.addEventListener("mouseover", () => {
        box.style.transform = "translateY(-2px)";
        box.style.boxShadow = "0 6px 16px rgba(0,0,0,0.2)";
      });

      box.addEventListener("mouseout", () => {
        box.style.transform = "translateY(0)";
        box.style.boxShadow = "none";
      });

      summary.appendChild(box);
    });

    content.appendChild(summary);

    // Get all issues
    const allIssues = [
      ...results.interactive.invalid,
      ...results.images.invalid,
      ...results.headings.invalid,
      ...results.meta.invalid,
    ];

    if (allIssues.length > 0) {
      // Create issues section with fixed header
      const issuesSection = document.createElement("div");
      issuesSection.style.cssText = `
        background-color: #1e293b;
        border-radius: 8px;
        border: 1px solid #334155;
        margin-bottom: 20px;
        overflow: hidden;
      `;

      // Issues header
      const issuesHeader = document.createElement("div");
      issuesHeader.style.cssText = `
        padding: 16px;
        border-bottom: 1px solid #334155;
        display: flex;
        align-items: center;
        gap: 8px;
      `;
      issuesHeader.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2">
          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path>
          <line x1="12" y1="9" x2="12" y2="13"></line>
          <line x1="12" y1="17" x2="12.01" y2="17"></line>
        </svg>
        <span style="font-weight: 600; font-size: 16px;">Issues Found (${allIssues.length})</span>
      `;
      issuesSection.appendChild(issuesHeader);

      // Visibility toggle
      const visibilityToggle = document.createElement("div");
      visibilityToggle.style.cssText = `
        padding: 8px 16px;
        border-bottom: 1px solid #334155;
        display: flex;
        align-items: center;
        gap: 8px;
      `;

      const showHiddenSwitch = document.createElement("label");
      showHiddenSwitch.style.cssText = `
        display: flex;
        align-items: center;
        cursor: pointer;
        user-select: none;
        gap: 8px;
      `;

      const showHiddenCheckbox = document.createElement("input");
      showHiddenCheckbox.type = "checkbox";
      showHiddenCheckbox.style.cssText = `
        height: 0;
        width: 0;
        visibility: hidden;
        position: absolute;
      `;

      const switchSlider = document.createElement("span");
      switchSlider.style.cssText = `
        position: relative;
        display: block;
        width: 40px;
        height: 20px;
        background: #334155;
        border-radius: 100px;
        transition: 0.2s;
      `;

      // Add the toggle circle
      const sliderCircle = document.createElement("span");
      sliderCircle.style.cssText = `
        position: absolute;
        top: 2px;
        left: 2px;
        width: 16px;
        height: 16px;
        border-radius: 16px;
        transition: 0.2s;
        background: white;
      `;
      switchSlider.appendChild(sliderCircle);

      showHiddenSwitch.appendChild(showHiddenCheckbox);
      showHiddenSwitch.appendChild(switchSlider);
      showHiddenSwitch.appendChild(
        document.createTextNode("Show hidden elements")
      );

      visibilityToggle.appendChild(showHiddenSwitch);
      issuesSection.appendChild(visibilityToggle);

      // Toggle hidden elements visibility
      let showHidden = false;
      showHiddenCheckbox.addEventListener("change", function () {
        showHidden = this.checked;
        if (showHidden) {
          sliderCircle.style.left = "calc(100% - 18px)";
          switchSlider.style.background = "#3b82f6";
        } else {
          sliderCircle.style.left = "2px";
          switchSlider.style.background = "#334155";
        }

        // Update tabs content
        updateTabsContent();
      });

      function updateTabsContent() {
        // Rebuild tabs with filtered content
        const filteredResults = {
          interactive: {
            invalid: results.interactive.invalid.filter(
              (item) => showHidden || !item.isHidden
            ),
          },
          images: {
            invalid: results.images.invalid.filter(
              (item) => showHidden || !item.isHidden
            ),
          },
          headings: {
            invalid: results.headings.invalid.filter(
              (item) => showHidden || !item.isHidden
            ),
          },
        };

        const filteredAllIssues = [
          ...filteredResults.interactive.invalid,
          ...filteredResults.images.invalid,
          ...filteredResults.headings.invalid,
        ];

        // Update issue count in header
        issuesHeader.innerHTML = `
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2">
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
          <span style="font-weight: 600; font-size: 16px;">Issues Found (${filteredAllIssues.length})</span>
        `;

        // Update tab labels
        tabsContainer.querySelectorAll("button").forEach((btn) => {
          const tabId = btn.dataset.tab;
          let count = 0;
          if (tabId === "all") {
            count = filteredAllIssues.length;
          } else if (tabId === "interactive") {
            count = filteredResults.interactive.invalid.length;
          } else if (tabId === "images") {
            count = filteredResults.images.invalid.length;
          } else if (tabId === "headings") {
            count = filteredResults.headings.invalid.length;
          }

          const label = tabId.charAt(0).toUpperCase() + tabId.slice(1);
          btn.textContent = `${label} (${count})`;
        });

        // Update tab content
        Object.entries({
          all: filteredAllIssues,
          interactive: filteredResults.interactive.invalid,
          images: filteredResults.images.invalid,
          headings: filteredResults.headings.invalid,
        }).forEach(([tabId, issues]) => {
          const tabContent = issuesContent.querySelector(
            `[data-content="${tabId}"]`
          );
          if (!tabContent) return;

          if (issues.length === 0) {
            tabContent.innerHTML = `<p style="color: #94a3b8; text-align: center;">No issues found</p>`;
          } else {
            const list = document.createElement("ul");
            list.style.cssText = `
              list-style-type: none;
              padding: 0;
              margin: 0;
            `;

            issues.forEach((issue) => {
              const li = document.createElement("li");
              li.style.cssText = `
                margin-bottom: 12px;
                background-color: #0f172a;
                border-radius: 6px;
                overflow: hidden;
                transition: transform 0.2s, box-shadow 0.2s;
                border: 1px solid #334155;
                ${issue.isHidden ? "opacity: 0.7;" : ""}
              `;

              // Determine issue type icon
              let typeIcon = "";
              if (issue.type === "link" || issue.type === "button") {
                typeIcon =
                  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>';
              } else if (issue.id.includes("image")) {
                typeIcon =
                  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>';
              } else if (issue.id.includes("heading")) {
                typeIcon =
                  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" stroke-width="2"><path d="M6 12h12"></path><path d="M6 20V4"></path><path d="M18 20V4"></path></svg>';
              }

              const link = document.createElement("div");
              link.style.cssText = `cursor: pointer;`;
              link.innerHTML = `
                <div style="padding: 12px; display: flex; gap: 10px; align-items: flex-start;">
                  <div style="margin-top: 2px;">${typeIcon}</div>
                  <div style="flex: 1;">
                    <div style="font-weight: 500; margin-bottom: 4px;">${
                      issue.issue
                    }</div>
                    <div style="font-size: 12px; color: #94a3b8;">
                      Element: ${issue.element.tagName.toLowerCase()}${
                issue.element.id ? " #" + issue.element.id : ""
              }${
                issue.element.className
                  ? " ." + issue.element.className.split(" ")[0]
                  : ""
              }
                      ${issue.isHidden ? " (Hidden)" : ""}
                    </div>
                  </div>
                </div>
              `;

              link.addEventListener("click", () => {
                container.style.display = "none";
                flashElement(issue.element);
              });

              li.appendChild(link);

              li.addEventListener("mouseover", () => {
                li.style.transform = "translateY(-2px)";
                li.style.boxShadow = "0 4px 12px rgba(0,0,0,0.2)";
              });

              li.addEventListener("mouseout", () => {
                li.style.transform = "translateY(0)";
                li.style.boxShadow = "none";
              });

              list.appendChild(li);
            });

            tabContent.innerHTML = "";
            tabContent.appendChild(list);
          }
        });
      }

      // Tabs container
      const tabsContainer = document.createElement("div");
      tabsContainer.style.cssText = `
        display: flex;
        padding: 0 16px;
        border-bottom: 1px solid #334155;
        overflow-x: auto;
        scrollbar-width: thin;
        scrollbar-color: #475569 #1e293b;
      `;

      // Create tabs
      const tabs = [
        { id: "all", label: `All (${allIssues.length})` },
        {
          id: "interactive",
          label: `Interactive (${results.interactive.invalid.length})`,
        },
        { id: "images", label: `Images (${results.images.invalid.length})` },
        {
          id: "headings",
          label: `Headings (${results.headings.invalid.length})`,
        },
      ].filter(
        (tab) => tab.id === "all" || parseInt(tab.label.match(/\d+/)[0]) > 0
      );

      tabs.forEach((tab, index) => {
        const tabButton = document.createElement("button");
        tabButton.textContent = tab.label;
        tabButton.dataset.tab = tab.id;
        tabButton.style.cssText = `
          background: none;
          border: none;
          color: ${index === 0 ? "white" : "#94a3b8"};
          padding: 12px 16px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          border-bottom: 2px solid ${index === 0 ? "#3b82f6" : "transparent"};
          transition: all 0.2s;
          white-space: nowrap;
        `;
        tabButton.addEventListener("click", () => {
          // Update active tab
          tabsContainer.querySelectorAll("button").forEach((btn) => {
            btn.style.color = "#94a3b8";
            btn.style.borderBottomColor = "transparent";
          });
          tabButton.style.color = "white";
          tabButton.style.borderBottomColor = "#3b82f6";

          // Show corresponding content
          issuesContent.querySelectorAll(".tab-content").forEach((content) => {
            content.style.display = "none";
          });
          issuesContent.querySelector(
            `[data-content="${tab.id}"]`
          ).style.display = "block";
        });

        tabsContainer.appendChild(tabButton);
      });

      issuesSection.appendChild(tabsContainer);

      // Issues content
      const issuesContent = document.createElement("div");
      issuesContent.style.cssText = `
        max-height: 300px;
        overflow-y: auto;
        padding: 16px;
      `;

      // Create content for each tab
      const tabContents = {
        all: allIssues,
        interactive: results.interactive.invalid,
        images: results.images.invalid,
        headings: results.headings.invalid,
      };

      Object.entries(tabContents).forEach(([tabId, issues]) => {
        if (tabId !== "all" && issues.length === 0) return;

        const tabContent = document.createElement("div");
        tabContent.className = "tab-content";
        tabContent.dataset.content = tabId;
        tabContent.style.display = tabId === "all" ? "block" : "none";

        if (issues.length === 0) {
          tabContent.innerHTML = `<p style="color: #94a3b8; text-align: center;">No issues found</p>`;
        } else {
          const list = document.createElement("ul");
          list.style.cssText = `
            list-style-type: none;
            padding: 0;
            margin: 0;
          `;

          issues.forEach((issue) => {
            const li = document.createElement("li");
            li.style.cssText = `
              margin-bottom: 12px;
              background-color: #0f172a;
              border-radius: 6px;
              overflow: hidden;
              transition: transform 0.2s, box-shadow 0.2s;
              border: 1px solid #334155;
              ${issue.isHidden ? "opacity: 0.7;" : ""}
            `;

            // Determine issue type icon
            let typeIcon = "";
            if (issue.type === "link" || issue.type === "button") {
              typeIcon =
                '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>';
            } else if (issue.id.includes("image")) {
              typeIcon =
                '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>';
            } else if (issue.id.includes("heading")) {
              typeIcon =
                '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" stroke-width="2"><path d="M6 12h12"></path><path d="M6 20V4"></path><path d="M18 20V4"></path></svg>';
            }

            const link = document.createElement("div");
            link.style.cssText = `cursor: pointer;`;
            link.innerHTML = `
              <div style="padding: 12px; display: flex; gap: 10px; align-items: flex-start;">
                <div style="margin-top: 2px;">${typeIcon}</div>
                <div style="flex: 1;">
                  <div style="font-weight: 500; margin-bottom: 4px;">${
                    issue.issue
                  }</div>
                  <div style="font-size: 12px; color: #94a3b8;">
                    Element: ${issue.element.tagName.toLowerCase()}${
              issue.element.id ? " #" + issue.element.id : ""
            }${
              issue.element.className
                ? " ." + issue.element.className.split(" ")[0]
                : ""
            }
                    ${issue.isHidden ? " (Hidden)" : ""}
                  </div>
                </div>
              </div>
            `;

            link.addEventListener("click", () => {
              container.style.display = "none";
              flashElement(issue.element);
            });

            li.appendChild(link);

            li.addEventListener("mouseover", () => {
              li.style.transform = "translateY(-2px)";
              li.style.boxShadow = "0 4px 12px rgba(0,0,0,0.2)";
            });

            li.addEventListener("mouseout", () => {
              li.style.transform = "translateY(0)";
              li.style.boxShadow = "none";
            });

            list.appendChild(li);
          });

          tabContent.appendChild(list);
        }

        issuesContent.appendChild(tabContent);
      });

      issuesSection.appendChild(issuesContent);
      content.appendChild(issuesSection);
    }

    document.body.appendChild(container);
    return container;
  }

  // Initialize and handle toggle button click
  let resultsPanel;
  let isPersistentMode = false; // Global persistent mode state

  toggleButton.addEventListener("click", () => {
    if (!resultsPanel || !document.body.contains(resultsPanel)) {
      const results = checkAccessibilityAndSEO();
      resultsPanel = createResultsPanel(results);
    }

    const isVisible = resultsPanel.style.display !== "none";
    if (isVisible) {
      resultsPanel.style.display = "none";
      // Only cleanup if not in persistent mode
      if (!isPersistentMode) {
        cleanupHighlights();
      }
    } else {
      resultsPanel.style.display = "block";
    }
  });
});

console.log(
  "Flowki Accessibility & SEO Checker loaded - Enhanced version with Webflow support"
);
