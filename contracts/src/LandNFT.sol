// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title LandNFT - Land Parcels as NFTs on Arc Testnet
contract LandNFT is ERC721, ERC721URIStorage, Ownable {
    uint256 private _nextTokenId = 1;
    uint256 public constant MAX_PARCELS = 1024;
    uint256 public constant GRID_SIZE = 32;

    enum ZoneType { Commercial, Residential, Industrial, Special }

    struct ParcelData {
        uint16 x;
        uint16 y;
        uint16 width;
        uint16 height;
        ZoneType zoneType;
        uint8 developmentLevel;
        uint256 pricePerDay;
        bool forRent;
    }

    mapping(uint256 => ParcelData) public parcels;

    event ParcelMinted(uint256 indexed tokenId, address indexed owner, uint16 x, uint16 y, ZoneType zoneType);
    event ParcelListedForRent(uint256 indexed tokenId, uint256 pricePerDay);
    event DevelopmentLevelUp(uint256 indexed tokenId, uint8 newLevel);

    constructor() ERC721("CubeCraft Land", "CCLAND") Ownable(msg.sender) {}

    function mintParcel(
        address to,
        uint16 x,
        uint16 y,
        uint16 width,
        uint16 height,
        ZoneType zoneType,
        uint256 pricePerDay,
        string memory uri
    ) public onlyOwner returns (uint256) {
        require(_nextTokenId <= MAX_PARCELS, "All parcels minted");
        require(x + width <= GRID_SIZE && y + height <= GRID_SIZE, "Out of bounds");

        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);

        parcels[tokenId] = ParcelData({
            x: x,
            y: y,
            width: width,
            height: height,
            zoneType: zoneType,
            developmentLevel: 0,
            pricePerDay: pricePerDay,
            forRent: false
        });

        if (bytes(uri).length > 0) {
            _setTokenURI(tokenId, uri);
        }

        emit ParcelMinted(tokenId, to, x, y, zoneType);
        return tokenId;
    }

    function listForRent(uint256 tokenId, uint256 pricePerDay) external {
        require(ownerOf(tokenId) == msg.sender, "Not owner");
        parcels[tokenId].pricePerDay = pricePerDay;
        parcels[tokenId].forRent = true;
        emit ParcelListedForRent(tokenId, pricePerDay);
    }

    function unlistFromRent(uint256 tokenId) external {
        require(ownerOf(tokenId) == msg.sender, "Not owner");
        parcels[tokenId].forRent = false;
    }

    function upgradeDevelopment(uint256 tokenId) external {
        require(ownerOf(tokenId) == msg.sender, "Not owner");
        require(parcels[tokenId].developmentLevel < 5, "Max level reached");
        parcels[tokenId].developmentLevel++;
        emit DevelopmentLevelUp(tokenId, parcels[tokenId].developmentLevel);
    }

    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
