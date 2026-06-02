function createDefaultCover() {
  return {
    companyName: '',
    slogan: '',
    title: '',
    subtitle: '',
    month: '',
    year: '',
    docCode: '',
    version: '',
    date: '',
    format: 'A4',
    orientation: 'portrait',
    font: 'termes',
    fontSize: 12,
    lineHeight: 1.15,
    paragraphSpacing: 0.55,
    marginTop: 25,
    marginRight: 25,
    marginBottom: 25,
    marginLeft: 25,
    showHeaderFooter: true,
    includeToc: true,
    primaryColor: '#006399',
    coverStyle: 'editorial',
    locationLabel: '',
    responsibles: [],
    logo: '',
    coverPhoto: ''
  };
}

export { createDefaultCover };
